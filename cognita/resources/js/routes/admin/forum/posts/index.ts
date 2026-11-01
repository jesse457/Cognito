import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\Admin\ForumModerationController::hide
* @see app/Http/Controllers/Admin/ForumModerationController.php:44
* @route '/api/admin/forum/posts/{post}/hide'
*/
export const hide = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: hide.url(args, options),
    method: 'post',
})

hide.definition = {
    methods: ["post"],
    url: '/api/admin/forum/posts/{post}/hide',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::hide
* @see app/Http/Controllers/Admin/ForumModerationController.php:44
* @route '/api/admin/forum/posts/{post}/hide'
*/
hide.url = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { post: args }
    }

    if (Array.isArray(args)) {
        args = {
            post: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        post: args.post,
    }

    return hide.definition.url
            .replace('{post}', parsedArgs.post.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::hide
* @see app/Http/Controllers/Admin/ForumModerationController.php:44
* @route '/api/admin/forum/posts/{post}/hide'
*/
hide.post = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: hide.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::hide
* @see app/Http/Controllers/Admin/ForumModerationController.php:44
* @route '/api/admin/forum/posts/{post}/hide'
*/
const hideForm = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: hide.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::hide
* @see app/Http/Controllers/Admin/ForumModerationController.php:44
* @route '/api/admin/forum/posts/{post}/hide'
*/
hideForm.post = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: hide.url(args, options),
    method: 'post',
})

hide.form = hideForm

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::remove
* @see app/Http/Controllers/Admin/ForumModerationController.php:54
* @route '/api/admin/forum/posts/{post}'
*/
export const remove = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: remove.url(args, options),
    method: 'delete',
})

remove.definition = {
    methods: ["delete"],
    url: '/api/admin/forum/posts/{post}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::remove
* @see app/Http/Controllers/Admin/ForumModerationController.php:54
* @route '/api/admin/forum/posts/{post}'
*/
remove.url = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { post: args }
    }

    if (Array.isArray(args)) {
        args = {
            post: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        post: args.post,
    }

    return remove.definition.url
            .replace('{post}', parsedArgs.post.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::remove
* @see app/Http/Controllers/Admin/ForumModerationController.php:54
* @route '/api/admin/forum/posts/{post}'
*/
remove.delete = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: remove.url(args, options),
    method: 'delete',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::remove
* @see app/Http/Controllers/Admin/ForumModerationController.php:54
* @route '/api/admin/forum/posts/{post}'
*/
const removeForm = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: remove.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::remove
* @see app/Http/Controllers/Admin/ForumModerationController.php:54
* @route '/api/admin/forum/posts/{post}'
*/
removeForm.delete = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: remove.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

remove.form = removeForm

const posts = {
    hide: Object.assign(hide, hide),
    remove: Object.assign(remove, remove),
}

export default posts