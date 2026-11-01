import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Panel\Instructor\NoteController::store
* @see app/Http/Controllers/Panel/Instructor/NoteController.php:27
* @route '/instructor/classes/{class}/students/{student}/notes'
*/
export const store = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/instructor/classes/{class}/students/{student}/notes',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Instructor\NoteController::store
* @see app/Http/Controllers/Panel/Instructor/NoteController.php:27
* @route '/instructor/classes/{class}/students/{student}/notes'
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
* @see \App\Http\Controllers\Panel\Instructor\NoteController::store
* @see app/Http/Controllers/Panel/Instructor/NoteController.php:27
* @route '/instructor/classes/{class}/students/{student}/notes'
*/
store.post = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\NoteController::store
* @see app/Http/Controllers/Panel/Instructor/NoteController.php:27
* @route '/instructor/classes/{class}/students/{student}/notes'
*/
const storeForm = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\NoteController::store
* @see app/Http/Controllers/Panel/Instructor/NoteController.php:27
* @route '/instructor/classes/{class}/students/{student}/notes'
*/
storeForm.post = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

store.form = storeForm

const NoteController = { store }

export default NoteController