<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\CourseStatus;
use App\Enums\LessonStatus;
use App\Enums\LessonType;
use App\Models\Course;
use App\Models\Section;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * A small catalogue with real outlines: free and paid courses, short and long,
 * so the community library has something to browse on a fresh install.
 *
 * Idempotent: courses, sections and lessons are matched on their stable titles.
 */
class CourseSeeder extends Seeder
{
    public function run(): void
    {
        $instructor = User::query()->where('email', 'instructor@cognita.test')->first();

        if ($instructor === null) {
            return;
        }

        foreach ($this->catalogue() as $entry) {
            $course = Course::query()->firstOrCreate(
                [
                    'title' => $entry['title'],
                    'instructor_id' => $instructor->getKey(),
                ],
                [
                    'description' => $entry['description'],
                    'status' => CourseStatus::Published,
                    'is_paid' => $entry['price_cents'] > 0,
                    'price_cents' => $entry['price_cents'],
                    'currency' => 'USD',
                    'payment_instructions' => $entry['price_cents'] > 0
                        ? 'Pay by bank transfer or mobile money, then send the reference to your instructor.'
                        : null,
                ],
            );

            foreach ($entry['sections'] as $sectionPosition => $sectionData) {
                $section = Section::query()->firstOrCreate(
                    [
                        'course_id' => $course->getKey(),
                        'title' => $sectionData['title'],
                    ],
                    [
                        'description' => $sectionData['description'] ?? null,
                        'position' => $sectionPosition + 1,
                    ],
                );

                foreach ($sectionData['lessons'] as $lessonPosition => $lessonData) {
                    $section->lessons()->firstOrCreate(
                        ['title' => $lessonData['title']],
                        [
                            'type' => $lessonData['type'] ?? LessonType::Article,
                            'status' => $lessonData['status'] ?? LessonStatus::Published,
                            'content' => $lessonData['content'],
                            'video_url' => $lessonData['video_url'] ?? null,
                            'duration_minutes' => $lessonData['duration_minutes'] ?? 10,
                            'position' => $lessonPosition + 1,
                        ],
                    );
                }
            }
        }
    }

    /**
     * @return list<array{title: string, description: string, price_cents: int, sections: list<array<string, mixed>>}>
     */
    private function catalogue(): array
    {
        return [
            [
                'title' => 'Foundations of Applied Physics',
                'description' => 'Momentum, forces and energy, taught through the problems students actually get stuck on.',
                'price_cents' => 0,
                'sections' => [
                    [
                        'title' => 'Momentum and collisions',
                        'description' => 'Conservation laws and how to choose a sign convention.',
                        'lessons' => [
                            [
                                'title' => 'What momentum really measures',
                                'type' => LessonType::Article,
                                'content' => "Momentum is mass times velocity. Unlike speed, it has a direction, so the sign you choose matters. Write the direction convention at the top of every problem before you substitute numbers.\n\nA useful check: the total momentum before an interaction equals the total momentum after it, provided no external force acts on the system.",
                                'duration_minutes' => 12,
                            ],
                            [
                                'title' => 'Elastic and inelastic collisions',
                                'type' => LessonType::Video,
                                'content' => "In an elastic collision both momentum and kinetic energy are conserved. In a perfectly inelastic collision the objects stick together and kinetic energy is lost.\n\nWork through two carts on a track, first bouncing apart, then coupling, and compare the two energy columns.",
                                'duration_minutes' => 18,
                            ],
                            [
                                'title' => 'Worked example: the two-cart problem',
                                'type' => LessonType::Article,
                                'content' => "Start with a table: mass, initial velocity and final velocity for each cart. Choose right as positive. Substitute into the momentum equation and solve for the one unknown.\n\nOnly then check kinetic energy to decide whether the collision was elastic.",
                                'duration_minutes' => 15,
                            ],
                        ],
                    ],
                    [
                        'title' => 'Forces and free-body diagrams',
                        'description' => 'Drawing the diagram correctly solves half the problem.',
                        'lessons' => [
                            [
                                'title' => 'Building a free-body diagram',
                                'type' => LessonType::Article,
                                'content' => "Isolate the object, then draw only the forces acting on it: weight, normal reaction, friction and any applied push or pull. Never draw the force the object exerts on something else.\n\nLabel each arrow with its symbol and direction.",
                                'duration_minutes' => 14,
                            ],
                            [
                                'title' => 'Why the normal force is not always mg',
                                'type' => LessonType::Video,
                                'content' => "Set N = mg only when the surface is horizontal and there is no vertical acceleration. In a lift accelerating upward, N = m(g + a). In free fall, N is zero.\n\nThe normal force is whatever the surface must push with to stop the object passing through it.",
                                'duration_minutes' => 16,
                            ],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Mathematics for Engineers',
                'description' => 'The algebra, calculus and vectors you keep needing in later modules, refreshed in short lessons.',
                'price_cents' => 0,
                'sections' => [
                    [
                        'title' => 'Algebra refresh',
                        'lessons' => [
                            ['title' => 'Rearranging equations without losing signs', 'content' => 'Do the same operation to both sides and keep the equation balanced. When you divide by a negative, the inequality flips — an easy mark to lose in an exam.', 'duration_minutes' => 11],
                            ['title' => 'Logs and exponentials', 'content' => 'A logarithm answers a question about powers: log base 10 of 1000 is 3 because 10 cubed is 1000. Use logs to bring an unknown out of an exponent.', 'duration_minutes' => 13],
                        ],
                    ],
                    [
                        'title' => 'Vectors',
                        'lessons' => [
                            ['title' => 'Components and direction', 'content' => 'Resolve a vector into horizontal and vertical parts with sine and cosine. Add the components separately, then rebuild the resultant.', 'duration_minutes' => 17],
                            ['title' => 'The dot product', 'content' => 'The dot product measures how much two vectors point the same way. It is zero when they are perpendicular, which is a useful test in force problems.', 'duration_minutes' => 12],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Study Skills for Online Learners',
                'description' => 'A short, practical course on keeping momentum when nobody is sitting next to you.',
                'price_cents' => 0,
                'sections' => [
                    [
                        'title' => 'Building a routine',
                        'lessons' => [
                            ['title' => 'A weekly rhythm that survives a busy week', 'content' => 'Pick two fixed study blocks and protect them. Short, repeated sessions beat one long cram because you get a retrieval attempt each time you return.', 'duration_minutes' => 8],
                            ['title' => 'Active recall in ten minutes', 'content' => 'Close the notes and write what you remember before rereading. The gap you cannot fill is the part worth studying next.', 'duration_minutes' => 9],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Advanced Thermodynamics',
                'description' => 'A paid, deeper course on entropy, cycles and real gases for students preparing for finals.',
                'price_cents' => 7900,
                'sections' => [
                    [
                        'title' => 'The second law',
                        'lessons' => [
                            ['title' => 'Entropy as a state function', 'content' => 'Entropy depends only on the state, not the path taken to reach it. For a reversible process, dS equals the reversible heat transfer divided by temperature.', 'type' => LessonType::Video, 'duration_minutes' => 22],
                            ['title' => 'Why heat engines have a ceiling', 'content' => 'The Carnot efficiency sets the maximum possible work from a temperature difference. No real engine can beat it; every real engine loses more.', 'duration_minutes' => 19],
                            ['title' => 'Worked example: a Carnot cycle', 'content' => 'Track the four steps, calculate heat and work on each leg, and check that the net work equals the difference of the two heat transfers.', 'duration_minutes' => 25],
                        ],
                    ],
                    [
                        'title' => 'Real gases',
                        'lessons' => [
                            ['title' => 'Where the ideal gas law breaks down', 'content' => 'At high pressure and low temperature, molecular volume and attractions matter. The van der Waals equation adds a term for each.', 'duration_minutes' => 20],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Exam Bootcamp: Mechanics',
                'description' => 'A focused paid revision sprint: timed problems, common traps and a marking-scheme walkthrough.',
                'price_cents' => 2900,
                'sections' => [
                    [
                        'title' => 'Timed practice',
                        'lessons' => [
                            ['title' => 'Reading the question in thirty seconds', 'content' => 'Circle the quantity asked for, underline the given values, and write the principle you will use before touching algebra.', 'duration_minutes' => 10],
                            ['title' => 'Sign conventions that cost marks', 'content' => 'Most lost marks in mechanics come from a sign flip, not from the physics. State your positive direction and keep it consistent.', 'duration_minutes' => 12],
                            ['title' => 'Full paper walkthrough', 'type' => LessonType::Quiz, 'content' => 'Work a complete past paper under exam conditions, then mark it against the scheme and note the three highest-value mistakes.', 'duration_minutes' => 45],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Python for Data Analysis',
                'description' => 'A paid, hands-on introduction to loading, cleaning and plotting real datasets.',
                'price_cents' => 4500,
                'sections' => [
                    [
                        'title' => 'Getting the data in',
                        'lessons' => [
                            ['title' => 'Reading a CSV without surprises', 'content' => 'Check the delimiter, the header row and the missing-value markers before you trust a dataframe. Most analysis errors start here.', 'type' => LessonType::Video, 'duration_minutes' => 16],
                            ['title' => 'Cleaning columns', 'content' => 'Standardise names, coerce dates and decide explicitly what to do with nulls. Keep a short log of every transformation.', 'duration_minutes' => 18],
                        ],
                    ],
                    [
                        'title' => 'Telling the story',
                        'lessons' => [
                            ['title' => 'Choosing a chart', 'content' => 'Use a scatter plot for relationships, a bar chart for comparisons and a line for change over time. Label the axes with units.', 'duration_minutes' => 14],
                        ],
                    ],
                ],
            ],
        ];
    }
}
