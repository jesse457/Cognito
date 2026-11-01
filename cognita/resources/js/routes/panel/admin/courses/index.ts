import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::index
* @see app/Http/Controllers/Panel/Admin/CourseController.php:25
* @route '/admin/courses'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/admin/courses',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::index
* @see app/Http/Controllers/Panel/Admin/CourseController.php:25
* @route '/admin/courses'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::index
* @see app/Http/Controllers/Panel/Admin/CourseController.php:25
* @route '/admin/courses'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::index
* @see app/Http/Controllers/Panel/Admin/CourseController.php:25
* @route '/admin/courses'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::index
* @see app/Http/Controllers/Panel/Admin/CourseController.php:25
* @route '/admin/courses'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::index
* @see app/Http/Controllers/Panel/Admin/CourseController.php:25
* @route '/admin/courses'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::index
* @see app/Http/Controllers/Panel/Admin/CourseController.php:25
* @route '/admin/courses'
*/
indexForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url({
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

index.form = indexForm

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::remove
* @see app/Http/Controllers/Panel/Admin/CourseController.php:65
* @route '/admin/courses/{course}/remove'
*/
export const remove = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: remove.url(args, options),
    method: 'post',
})

remove.definition = {
    methods: ["post"],
    url: '/admin/courses/{course}/remove',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::remove
* @see app/Http/Controllers/Panel/Admin/CourseController.php:65
* @route '/admin/courses/{course}/remove'
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
* @see \App\Http\Controllers\Panel\Admin\CourseController::remove
* @see app/Http/Controllers/Panel/Admin/CourseController.php:65
* @route '/admin/courses/{course}/remove'
*/
remove.post = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: remove.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::remove
* @see app/Http/Controllers/Panel/Admin/CourseController.php:65
* @route '/admin/courses/{course}/remove'
*/
const removeForm = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: remove.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::remove
* @see app/Http/Controllers/Panel/Admin/CourseController.php:65
* @route '/admin/courses/{course}/remove'
*/
removeForm.post = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: remove.url(args, options),
    method: 'post',
})

remove.form = removeForm

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::restore
* @see app/Http/Controllers/Panel/Admin/CourseController.php:82
* @route '/admin/courses/{course}/restore'
*/
export const restore = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: restore.url(args, options),
    method: 'post',
})

restore.definition = {
    methods: ["post"],
    url: '/admin/courses/{course}/restore',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::restore
* @see app/Http/Controllers/Panel/Admin/CourseController.php:82
* @route '/admin/courses/{course}/restore'
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
* @see \App\Http\Controllers\Panel\Admin\CourseController::restore
* @see app/Http/Controllers/Panel/Admin/CourseController.php:82
* @route '/admin/courses/{course}/restore'
*/
restore.post = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: restore.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::restore
* @see app/Http/Controllers/Panel/Admin/CourseController.php:82
* @route '/admin/courses/{course}/restore'
*/
const restoreForm = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: restore.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\CourseController::restore
* @see app/Http/Controllers/Panel/Admin/CourseController.php:82
* @route '/admin/courses/{course}/restore'
*/
restoreForm.post = (args: { course: string | number } | [course: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: restore.url(args, options),
    method: 'post',
})

restore.form = restoreForm

const courses = {
    index: Object.assign(index, index),
    remove: Object.assign(remove, remove),
    restore: Object.assign(restore, restore),
}

export default courses