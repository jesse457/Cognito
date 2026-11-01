import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\Admin\CourseModerationController::remove
* @see app/Http/Controllers/Admin/CourseModerationController.php:22
* @route '/api/admin/courses/{course}/remove'
*/
export const remove = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: remove.url(args, options),
    method: 'post',
})

remove.definition = {
    methods: ["post"],
    url: '/api/admin/courses/{course}/remove',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\CourseModerationController::remove
* @see app/Http/Controllers/Admin/CourseModerationController.php:22
* @route '/api/admin/courses/{course}/remove'
*/
remove.url = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { course: args }
    }

    if (Array.isArray(args)) {
        args = {
            course: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        course: args.course,
    }

    return remove.definition.url
            .replace('{course}', parsedArgs.course.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\CourseModerationController::remove
* @see app/Http/Controllers/Admin/CourseModerationController.php:22
* @route '/api/admin/courses/{course}/remove'
*/
remove.post = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: remove.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\CourseModerationController::remove
* @see app/Http/Controllers/Admin/CourseModerationController.php:22
* @route '/api/admin/courses/{course}/remove'
*/
const removeForm = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: remove.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\CourseModerationController::remove
* @see app/Http/Controllers/Admin/CourseModerationController.php:22
* @route '/api/admin/courses/{course}/remove'
*/
removeForm.post = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: remove.url(args, options),
    method: 'post',
})

remove.form = removeForm

/**
* @see \App\Http\Controllers\Admin\CourseModerationController::restore
* @see app/Http/Controllers/Admin/CourseModerationController.php:32
* @route '/api/admin/courses/{course}/restore'
*/
export const restore = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: restore.url(args, options),
    method: 'post',
})

restore.definition = {
    methods: ["post"],
    url: '/api/admin/courses/{course}/restore',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\CourseModerationController::restore
* @see app/Http/Controllers/Admin/CourseModerationController.php:32
* @route '/api/admin/courses/{course}/restore'
*/
restore.url = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { course: args }
    }

    if (Array.isArray(args)) {
        args = {
            course: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        course: args.course,
    }

    return restore.definition.url
            .replace('{course}', parsedArgs.course.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\CourseModerationController::restore
* @see app/Http/Controllers/Admin/CourseModerationController.php:32
* @route '/api/admin/courses/{course}/restore'
*/
restore.post = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: restore.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\CourseModerationController::restore
* @see app/Http/Controllers/Admin/CourseModerationController.php:32
* @route '/api/admin/courses/{course}/restore'
*/
const restoreForm = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: restore.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\CourseModerationController::restore
* @see app/Http/Controllers/Admin/CourseModerationController.php:32
* @route '/api/admin/courses/{course}/restore'
*/
restoreForm.post = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: restore.url(args, options),
    method: 'post',
})

restore.form = restoreForm

const courses = {
    remove: Object.assign(remove, remove),
    restore: Object.assign(restore, restore),
}

export default courses