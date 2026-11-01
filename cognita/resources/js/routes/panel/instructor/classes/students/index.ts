import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
import lessons from './lessons'
import notes from './notes'
/**
* @see \App\Http\Controllers\Panel\Instructor\StudentController::show
* @see app/Http/Controllers/Panel/Instructor/StudentController.php:33
* @route '/instructor/classes/{class}/students/{student}'
*/
export const show = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/instructor/classes/{class}/students/{student}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Panel\Instructor\StudentController::show
* @see app/Http/Controllers/Panel/Instructor/StudentController.php:33
* @route '/instructor/classes/{class}/students/{student}'
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
* @see \App\Http\Controllers\Panel\Instructor\StudentController::show
* @see app/Http/Controllers/Panel/Instructor/StudentController.php:33
* @route '/instructor/classes/{class}/students/{student}'
*/
show.get = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\StudentController::show
* @see app/Http/Controllers/Panel/Instructor/StudentController.php:33
* @route '/instructor/classes/{class}/students/{student}'
*/
show.head = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\StudentController::show
* @see app/Http/Controllers/Panel/Instructor/StudentController.php:33
* @route '/instructor/classes/{class}/students/{student}'
*/
const showForm = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\StudentController::show
* @see app/Http/Controllers/Panel/Instructor/StudentController.php:33
* @route '/instructor/classes/{class}/students/{student}'
*/
showForm.get = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\StudentController::show
* @see app/Http/Controllers/Panel/Instructor/StudentController.php:33
* @route '/instructor/classes/{class}/students/{student}'
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
    lessons: Object.assign(lessons, lessons),
    show: Object.assign(show, show),
    notes: Object.assign(notes, notes),
}

export default students