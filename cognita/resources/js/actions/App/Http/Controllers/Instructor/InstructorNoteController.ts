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

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::show
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:71
* @route '/api/instructor/classes/{class}/notes/{note}'
*/
export const show = (args: { class: string | number, note: string | number } | [classParam: string | number, note: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/notes/{note}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::show
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:71
* @route '/api/instructor/classes/{class}/notes/{note}'
*/
show.url = (args: { class: string | number, note: string | number } | [classParam: string | number, note: string | number ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
            class: args[0],
            note: args[1],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
        note: args.note,
    }

    return show.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace('{note}', parsedArgs.note.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::show
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:71
* @route '/api/instructor/classes/{class}/notes/{note}'
*/
show.get = (args: { class: string | number, note: string | number } | [classParam: string | number, note: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::show
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:71
* @route '/api/instructor/classes/{class}/notes/{note}'
*/
show.head = (args: { class: string | number, note: string | number } | [classParam: string | number, note: string | number ], options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::show
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:71
* @route '/api/instructor/classes/{class}/notes/{note}'
*/
const showForm = (args: { class: string | number, note: string | number } | [classParam: string | number, note: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::show
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:71
* @route '/api/instructor/classes/{class}/notes/{note}'
*/
showForm.get = (args: { class: string | number, note: string | number } | [classParam: string | number, note: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::show
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:71
* @route '/api/instructor/classes/{class}/notes/{note}'
*/
showForm.head = (args: { class: string | number, note: string | number } | [classParam: string | number, note: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

show.form = showForm

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::destroy
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:78
* @route '/api/instructor/classes/{class}/notes/{note}'
*/
export const destroy = (args: { class: string | number, note: string | number } | [classParam: string | number, note: string | number ], options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/api/instructor/classes/{class}/notes/{note}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::destroy
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:78
* @route '/api/instructor/classes/{class}/notes/{note}'
*/
destroy.url = (args: { class: string | number, note: string | number } | [classParam: string | number, note: string | number ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
            class: args[0],
            note: args[1],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
        note: args.note,
    }

    return destroy.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace('{note}', parsedArgs.note.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::destroy
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:78
* @route '/api/instructor/classes/{class}/notes/{note}'
*/
destroy.delete = (args: { class: string | number, note: string | number } | [classParam: string | number, note: string | number ], options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::destroy
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:78
* @route '/api/instructor/classes/{class}/notes/{note}'
*/
const destroyForm = (args: { class: string | number, note: string | number } | [classParam: string | number, note: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: destroy.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorNoteController::destroy
* @see app/Http/Controllers/Instructor/InstructorNoteController.php:78
* @route '/api/instructor/classes/{class}/notes/{note}'
*/
destroyForm.delete = (args: { class: string | number, note: string | number } | [classParam: string | number, note: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: destroy.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

destroy.form = destroyForm

const InstructorNoteController = { index, store, show, destroy }

export default InstructorNoteController