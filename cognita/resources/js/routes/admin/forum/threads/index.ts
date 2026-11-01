import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\Admin\ForumModerationController::lock
* @see app/Http/Controllers/Admin/ForumModerationController.php:24
* @route '/api/admin/forum/threads/{thread}/lock'
*/
export const lock = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: lock.url(args, options),
    method: 'post',
})

lock.definition = {
    methods: ["post"],
    url: '/api/admin/forum/threads/{thread}/lock',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::lock
* @see app/Http/Controllers/Admin/ForumModerationController.php:24
* @route '/api/admin/forum/threads/{thread}/lock'
*/
lock.url = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { thread: args }
    }

    if (Array.isArray(args)) {
        args = {
            thread: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        thread: args.thread,
    }

    return lock.definition.url
            .replace('{thread}', parsedArgs.thread.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::lock
* @see app/Http/Controllers/Admin/ForumModerationController.php:24
* @route '/api/admin/forum/threads/{thread}/lock'
*/
lock.post = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: lock.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::lock
* @see app/Http/Controllers/Admin/ForumModerationController.php:24
* @route '/api/admin/forum/threads/{thread}/lock'
*/
const lockForm = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: lock.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::lock
* @see app/Http/Controllers/Admin/ForumModerationController.php:24
* @route '/api/admin/forum/threads/{thread}/lock'
*/
lockForm.post = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: lock.url(args, options),
    method: 'post',
})

lock.form = lockForm

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::remove
* @see app/Http/Controllers/Admin/ForumModerationController.php:34
* @route '/api/admin/forum/threads/{thread}'
*/
export const remove = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: remove.url(args, options),
    method: 'delete',
})

remove.definition = {
    methods: ["delete"],
    url: '/api/admin/forum/threads/{thread}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::remove
* @see app/Http/Controllers/Admin/ForumModerationController.php:34
* @route '/api/admin/forum/threads/{thread}'
*/
remove.url = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { thread: args }
    }

    if (Array.isArray(args)) {
        args = {
            thread: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        thread: args.thread,
    }

    return remove.definition.url
            .replace('{thread}', parsedArgs.thread.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::remove
* @see app/Http/Controllers/Admin/ForumModerationController.php:34
* @route '/api/admin/forum/threads/{thread}'
*/
remove.delete = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: remove.url(args, options),
    method: 'delete',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::remove
* @see app/Http/Controllers/Admin/ForumModerationController.php:34
* @route '/api/admin/forum/threads/{thread}'
*/
const removeForm = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
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
* @see app/Http/Controllers/Admin/ForumModerationController.php:34
* @route '/api/admin/forum/threads/{thread}'
*/
removeForm.delete = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: remove.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

remove.form = removeForm

const threads = {
    lock: Object.assign(lock, lock),
    remove: Object.assign(remove, remove),
}

export default threads