<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Answer;
use App\Models\AnswerVote;
use App\Models\Classroom;
use App\Models\Question;
use App\Models\QuestionVote;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * A few believable threads so the board has something to read on a fresh
 * install: one solved question, one open answer, and one still unanswered.
 *
 * Idempotent: questions and answers are matched on their stable text.
 */
class QuestionSeeder extends Seeder
{
    public function run(): void
    {
        $instructor = User::query()->where('email', 'instructor@cognita.test')->first();
        $studentOne = User::query()->where('email', 'student1@cognita.test')->first();
        $studentTwo = User::query()->where('email', 'student2@cognita.test')->first();

        if ($instructor === null || $studentOne === null || $studentTwo === null) {
            return;
        }

        $classroom = Classroom::query()
            ->where('instructor_id', $instructor->getKey())
            ->where('name', DemoClassroomSeeder::CLASSROOM_NAME)
            ->first();

        if ($classroom === null) {
            return;
        }

        $collisions = $this->question(
            $classroom,
            $studentOne,
            'How do I tell elastic from inelastic collisions on the exam?',
            'When two carts collide, the question says one collision is elastic and another is inelastic. '
                .'I know energy is conserved in the first one, but I freeze when I have to decide which is which. '
                .'What is the quickest test to apply?',
            ['momentum', 'energy', 'exam'],
        );

        $energyAnswer = $this->answer(
            $collisions,
            $studentTwo,
            'Check whether the total kinetic energy before and after is the same. In an elastic collision it is exactly conserved, so the objects separate afterwards. In a perfectly inelastic collision they stick together and the maximum possible kinetic energy is lost. If the numbers in between do not match either case, the collision is partly inelastic.',
        );

        $this->answer(
            $collisions,
            $instructor,
            "A useful shortcut for the exam: if the problem says they 'stick together', it is perfectly inelastic. If it says the collision is elastic, use both conservation of momentum and conservation of kinetic energy. With one equation too few, elastic problems usually give you the final velocity of one object.",
        );

        $this->accept($collisions, $energyAnswer);
        $this->questionVote($collisions, $studentTwo, 1);
        $this->questionVote($collisions, $instructor, 1);
        $this->answerVote($energyAnswer, $studentOne, 1);
        $this->answerVote($energyAnswer, $instructor, 1);

        $normalForce = $this->question(
            $classroom,
            $studentTwo,
            'Why does the normal force not always equal mg?',
            'In the lift problem from the notes, the normal force changes when the lift accelerates. '
                .'I thought normal force always cancelled weight. When exactly should I set N = mg?',
            ['forces', 'revision'],
        );

        $liftAnswer = $this->answer(
            $normalForce,
            $studentOne,
            'Only set N = mg when the surface is horizontal and there is no acceleration in the vertical direction. When the lift accelerates upward, the floor has to push harder: N - mg = ma, so N = m(g + a). When it accelerates downward or the cable is cut, N drops, and in free fall it reaches zero.',
        );

        $this->questionVote($normalForce, $studentOne, 1);
        $this->answerVote($liftAnswer, $instructor, 1);

        $this->question(
            $classroom,
            $studentOne,
            'Can someone explain speed versus velocity with a real example?',
            'I understand the formulas, but the difference still feels like a definition question. '
                .'Could someone walk through a short example where the speed stays the same but the velocity changes?',
            ['kinematics'],
        );

        $physicsQuestion = $this->question(
            $classroom,
            $instructor,
            'What should we revise before the problem session on Thursday?',
            'Bring one question you got stuck on from the momentum problem set. '
                .'We will start with the questions that more than one of you found difficult, then do a timed example together.',
            ['momentum', 'revision'],
        );

        $revisionAnswer = $this->answer(
            $physicsQuestion,
            $studentTwo,
            'Could we go through the two-cart explosion example again? I can follow the momentum equation but I keep losing track of the signs when the carts move apart.',
        );

        $this->accept($physicsQuestion, $revisionAnswer);
        $this->questionVote($physicsQuestion, $studentOne, 1);
        $this->questionVote($physicsQuestion, $studentTwo, 1);

        $revision = $this->communityQuestion(
            $studentOne,
            'What is the best way to revise a derivation before an exam?',
            'I can follow the derivation in the notes, but I cannot reproduce it from a blank page. '
                .'Do you memorise the steps, or practise until the move feels obvious?',
            ['revision', 'study'],
        );

        $revisionAnswer = $this->answer(
            $revision,
            $instructor,
            'Try closing the notes and writing only the first line and the goal. If you can name the principle and what you are solving for, the middle usually follows. Then check the step you missed instead of rereading the whole page.',
        );

        $this->accept($revision, $revisionAnswer);
        $this->questionVote($revision, $studentTwo, 1);
        $this->answerVote($revisionAnswer, $studentOne, 1);

        $units = $this->communityQuestion(
            $studentTwo,
            'How do you keep units straight across a long problem?',
            'By the end of a multi-step mechanics problem my units are a mess. '
                .'Is there a habit that catches a slip before the final answer?',
            ['units', 'revision'],
        );

        $this->questionVote($units, $studentOne, 1);
    }

    /**
     * @param  list<string>  $tags
     */
    private function question(Classroom $classroom, User $author, string $title, string $body, array $tags): Question
    {
        return Question::query()->firstOrCreate(
            [
                'classroom_id' => $classroom->getKey(),
                'user_id' => $author->getKey(),
                'title' => $title,
            ],
            [
                'visibility' => Question::VISIBILITY_CLASSROOM,
                'body' => $body,
                'tags' => $tags,
            ],
        );
    }

    /**
     * @param  list<string>  $tags
     */
    private function communityQuestion(User $author, string $title, string $body, array $tags): Question
    {
        return Question::query()->firstOrCreate(
            [
                'classroom_id' => null,
                'user_id' => $author->getKey(),
                'title' => $title,
            ],
            [
                'visibility' => Question::VISIBILITY_COMMUNITY,
                'body' => $body,
                'tags' => $tags,
            ],
        );
    }

    private function answer(Question $question, User $author, string $body): Answer
    {
        return Answer::query()->firstOrCreate(
            [
                'question_id' => $question->getKey(),
                'user_id' => $author->getKey(),
                'body' => $body,
            ],
        );
    }

    private function accept(Question $question, Answer $answer): void
    {
        $question->answers()->update(['is_accepted' => false]);
        $answer->update(['is_accepted' => true]);
    }

    private function questionVote(Question $question, User $voter, int $value): void
    {
        if ((int) $question->user_id === (int) $voter->getKey()) {
            return;
        }

        QuestionVote::query()->updateOrCreate(
            [
                'question_id' => $question->getKey(),
                'user_id' => $voter->getKey(),
            ],
            ['value' => $value],
        );
    }

    private function answerVote(Answer $answer, User $voter, int $value): void
    {
        if ((int) $answer->user_id === (int) $voter->getKey()) {
            return;
        }

        AnswerVote::query()->updateOrCreate(
            [
                'answer_id' => $answer->getKey(),
                'user_id' => $voter->getKey(),
            ],
            ['value' => $value],
        );
    }
}
