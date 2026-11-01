import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../wayfinder'
import notes from './notes'
import lessons from './lessons'
/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::index
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:30
* @route '/api/instructor/classes/{class}/students'
*/
export const index = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(args, options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/students',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::index
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:30
* @route '/api/instructor/classes/{class}/students'
*/
index.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { class: args }
    }

    if (Array.isArray(args)) {
        args = {
            class: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
    }

    return index.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::index
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:30
* @route '/api/instructor/classes/{class}/students'
*/
index.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::index
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:30
* @route '/api/instructor/classes/{class}/students'
*/
index.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::index
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:30
* @route '/api/instructor/classes/{class}/students'
*/
const indexForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::index
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:30
* @route '/api/instructor/classes/{class}/students'
*/
indexForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::index
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:30
* @route '/api/instructor/classes/{class}/students'
*/
indexForm.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

index.form = indexForm

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::show
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:63
* @route '/api/instructor/classes/{class}/students/{student}'
*/
export const show = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/students/{student}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::show
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:63
* @route '/api/instructor/classes/{class}/students/{student}'
*/
show.url = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
            class: args[0],
            student: args[1],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
        student: args.student,
    }

    return show.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace('{student}', parsedArgs.student.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::show
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:63
* @route '/api/instructor/classes/{class}/students/{student}'
*/
show.get = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::show
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:63
* @route '/api/instructor/classes/{class}/students/{student}'
*/
show.head = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::show
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:63
* @route '/api/instructor/classes/{class}/students/{student}'
*/
const showForm = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::show
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:63
* @route '/api/instructor/classes/{class}/students/{student}'
*/
showForm.get = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorStudentController::show
* @see app/Http/Controllers/Instructor/InstructorStudentController.php:63
* @route '/api/instructor/classes/{class}/students/{student}'
*/
showForm.head = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

show.form = showForm

const students = {
    index: Object.assign(index, index),
    show: Object.assign(show, show),
    notes: Object.assign(notes, notes),
    lessons: Object.assign(lessons, lessons),
}

export default students