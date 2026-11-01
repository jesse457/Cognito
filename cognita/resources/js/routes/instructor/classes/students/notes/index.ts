import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::index
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:31
* @route '/api/instructor/classes/{class}/students/{student}/notes'
*/
export const index = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(args, options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/students/{student}/notes',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::index
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:31
* @route '/api/instructor/classes/{class}/students/{student}/notes'
*/
index.url = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions) => {
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

    return index.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace('{student}', parsedArgs.student.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::index
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:31
* @route '/api/instructor/classes/{class}/students/{student}/notes'
*/
index.get = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::index
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:31
* @route '/api/instructor/classes/{class}/students/{student}/notes'
*/
index.head = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::index
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:31
* @route '/api/instructor/classes/{class}/students/{student}/notes'
*/
const indexForm = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::index
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:31
* @route '/api/instructor/classes/{class}/students/{student}/notes'
*/
indexForm.get = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::index
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:31
* @route '/api/instructor/classes/{class}/students/{student}/notes'
*/
indexForm.head = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
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
* @see \App\Http\Controllers\Instructor\InstructorNoteController::store
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:50
* @route '/api/instructor/classes/{class}/students/{student}/notes'
*/
export const store = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/instructor/classes/{class}/students/{student}/notes',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::store
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:50
* @route '/api/instructor/classes/{class}/students/{student}/notes'
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
* @see \App\Http\Controllers\Instructor\InstructorNoteController::store
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:50
* @route '/api/instructor/classes/{class}/students/{student}/notes'
*/
store.post = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::store
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:50
* @route '/api/instructor/classes/{class}/students/{student}/notes'
*/
const storeForm = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::store
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:50
* @route '/api/instructor/classes/{class}/students/{student}/notes'
*/
storeForm.post = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

store.form = storeForm

const notes = {
    index: Object.assign(index, index),
    store: Object.assign(store, store),
}

export default notes