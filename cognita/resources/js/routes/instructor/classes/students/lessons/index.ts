import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Instructor\InstructorAssignmentController::store
* @see app/Http/Controllers/Instructor/InstructorAssignmentController.php:56
* @route '/api/instructor/classes/{class}/students/{student}/lessons'
*/
export const store = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/instructor/classes/{class}/students/{student}/lessons',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorAssignmentController::store
* @see app/Http/Controllers/Instructor/InstructorAssignmentController.php:56
* @route '/api/instructor/classes/{class}/students/{student}/lessons'
*/
store.url = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions) => {
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

    return store.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace('{student}', parsedArgs.student.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorAssignmentController::store
* @see app/Http/Controllers/Instructor/InstructorAssignmentController.php:56
* @route '/api/instructor/classes/{class}/students/{student}/lessons'
*/
store.post = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAssignmentController::store
* @see app/Http/Controllers/Instructor/InstructorAssignmentController.php:56
* @route '/api/instructor/classes/{class}/students/{student}/lessons'
*/
const storeForm = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAssignmentController::store
* @see app/Http/Controllers/Instructor/InstructorAssignmentController.php:56
* @route '/api/instructor/classes/{class}/students/{student}/lessons'
*/
storeForm.post = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

store.form = storeForm

const lessons = {
    store: Object.assign(store, store),
}

export default lessons