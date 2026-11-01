import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../wayfinder'
/**
* @see \App\Http\Controllers\Student\PracticeSessionController::start
* @see app/Http/Controllers/Student/PracticeSessionController.php:22
* @route '/api/practice-sessions'
*/
export const start = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: start.url(options),
    method: 'post',
})

start.definition = {
    methods: ["post"],
    url: '/api/practice-sessions',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::start
* @see app/Http/Controllers/Student/PracticeSessionController.php:22
* @route '/api/practice-sessions'
*/
start.url = (options?: RouteQueryOptions) => {
    return start.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::start
* @see app/Http/Controllers/Student/PracticeSessionController.php:22
* @route '/api/practice-sessions'
*/
start.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: start.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::start
* @see app/Http/Controllers/Student/PracticeSessionController.php:22
* @route '/api/practice-sessions'
*/
const startForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: start.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::start
* @see app/Http/Controllers/Student/PracticeSessionController.php:22
* @route '/api/practice-sessions'
*/
startForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: start.url(options),
    method: 'post',
})

start.form = startForm

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::answer
* @see app/Http/Controllers/Student/PracticeSessionController.php:44
* @route '/api/practice-sessions/{session}/answers'
*/
export const answer = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: answer.url(args, options),
    method: 'post',
})

answer.definition = {
    methods: ["post"],
    url: '/api/practice-sessions/{session}/answers',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::answer
* @see app/Http/Controllers/Student/PracticeSessionController.php:44
* @route '/api/practice-sessions/{session}/answers'
*/
answer.url = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { session: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { session: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            session: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        session: typeof args.session === 'object'
        ? args.session.id
        : args.session,
    }

    return answer.definition.url
            .replace('{session}', parsedArgs.session.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::answer
* @see app/Http/Controllers/Student/PracticeSessionController.php:44
* @route '/api/practice-sessions/{session}/answers'
*/
answer.post = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: answer.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::answer
* @see app/Http/Controllers/Student/PracticeSessionController.php:44
* @route '/api/practice-sessions/{session}/answers'
*/
const answerForm = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: answer.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::answer
* @see app/Http/Controllers/Student/PracticeSessionController.php:44
* @route '/api/practice-sessions/{session}/answers'
*/
answerForm.post = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: answer.url(args, options),
    method: 'post',
})

answer.form = answerForm

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::complete
* @see app/Http/Controllers/Student/PracticeSessionController.php:61
* @route '/api/practice-sessions/{session}/complete'
*/
export const complete = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: complete.url(args, options),
    method: 'post',
})

complete.definition = {
    methods: ["post"],
    url: '/api/practice-sessions/{session}/complete',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::complete
* @see app/Http/Controllers/Student/PracticeSessionController.php:61
* @route '/api/practice-sessions/{session}/complete'
*/
complete.url = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { session: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { session: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            session: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        session: typeof args.session === 'object'
        ? args.session.id
        : args.session,
    }

    return complete.definition.url
            .replace('{session}', parsedArgs.session.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::complete
* @see app/Http/Controllers/Student/PracticeSessionController.php:61
* @route '/api/practice-sessions/{session}/complete'
*/
complete.post = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: complete.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::complete
* @see app/Http/Controllers/Student/PracticeSessionController.php:61
* @route '/api/practice-sessions/{session}/complete'
*/
const completeForm = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: complete.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\PracticeSessionController::complete
* @see app/Http/Controllers/Student/PracticeSessionController.php:61
* @route '/api/practice-sessions/{session}/complete'
*/
completeForm.post = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: complete.url(args, options),
    method: 'post',
})

complete.form = completeForm

const practice = {
    start: Object.assign(start, start),
    answer: Object.assign(answer, answer),
    complete: Object.assign(complete, complete),
}

export default practice