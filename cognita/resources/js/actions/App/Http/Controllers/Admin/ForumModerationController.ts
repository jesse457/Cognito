import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Admin\ForumModerationController::lockThread
* @see app/Http/Controllers/Admin/ForumModerationController.php:24
* @route '/api/admin/forum/threads/{thread}/lock'
*/
export const lockThread = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: lockThread.url(args, options),
    method: 'post',
})

lockThread.definition = {
    methods: ["post"],
    url: '/api/admin/forum/threads/{thread}/lock',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::lockThread
* @see app/Http/Controllers/Admin/ForumModerationController.php:24
* @route '/api/admin/forum/threads/{thread}/lock'
*/
lockThread.url = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return lockThread.definition.url
            .replace('{thread}', parsedArgs.thread.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::lockThread
* @see app/Http/Controllers/Admin/ForumModerationController.php:24
* @route '/api/admin/forum/threads/{thread}/lock'
*/
lockThread.post = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: lockThread.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::lockThread
* @see app/Http/Controllers/Admin/ForumModerationController.php:24
* @route '/api/admin/forum/threads/{thread}/lock'
*/
const lockThreadForm = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: lockThread.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::lockThread
* @see app/Http/Controllers/Admin/ForumModerationController.php:24
* @route '/api/admin/forum/threads/{thread}/lock'
*/
lockThreadForm.post = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: lockThread.url(args, options),
    method: 'post',
})

lockThread.form = lockThreadForm

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::removeThread
* @see app/Http/Controllers/Admin/ForumModerationController.php:34
* @route '/api/admin/forum/threads/{thread}'
*/
export const removeThread = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: removeThread.url(args, options),
    method: 'delete',
})

removeThread.definition = {
    methods: ["delete"],
    url: '/api/admin/forum/threads/{thread}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::removeThread
* @see app/Http/Controllers/Admin/ForumModerationController.php:34
* @route '/api/admin/forum/threads/{thread}'
*/
removeThread.url = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return removeThread.definition.url
            .replace('{thread}', parsedArgs.thread.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::removeThread
* @see app/Http/Controllers/Admin/ForumModerationController.php:34
* @route '/api/admin/forum/threads/{thread}'
*/
removeThread.delete = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: removeThread.url(args, options),
    method: 'delete',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::removeThread
* @see app/Http/Controllers/Admin/ForumModerationController.php:34
* @route '/api/admin/forum/threads/{thread}'
*/
const removeThreadForm = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: removeThread.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::removeThread
* @see app/Http/Controllers/Admin/ForumModerationController.php:34
* @route '/api/admin/forum/threads/{thread}'
*/
removeThreadForm.delete = (args: { thread: string | number } | [thread: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: removeThread.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

removeThread.form = removeThreadForm

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::hidePost
* @see app/Http/Controllers/Admin/ForumModerationController.php:44
* @route '/api/admin/forum/posts/{post}/hide'
*/
export const hidePost = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: hidePost.url(args, options),
    method: 'post',
})

hidePost.definition = {
    methods: ["post"],
    url: '/api/admin/forum/posts/{post}/hide',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::hidePost
* @see app/Http/Controllers/Admin/ForumModerationController.php:44
* @route '/api/admin/forum/posts/{post}/hide'
*/
hidePost.url = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return hidePost.definition.url
            .replace('{post}', parsedArgs.post.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::hidePost
* @see app/Http/Controllers/Admin/ForumModerationController.php:44
* @route '/api/admin/forum/posts/{post}/hide'
*/
hidePost.post = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: hidePost.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::hidePost
* @see app/Http/Controllers/Admin/ForumModerationController.php:44
* @route '/api/admin/forum/posts/{post}/hide'
*/
const hidePostForm = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: hidePost.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::hidePost
* @see app/Http/Controllers/Admin/ForumModerationController.php:44
* @route '/api/admin/forum/posts/{post}/hide'
*/
hidePostForm.post = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: hidePost.url(args, options),
    method: 'post',
})

hidePost.form = hidePostForm

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::removePost
* @see app/Http/Controllers/Admin/ForumModerationController.php:54
* @route '/api/admin/forum/posts/{post}'
*/
export const removePost = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: removePost.url(args, options),
    method: 'delete',
})

removePost.definition = {
    methods: ["delete"],
    url: '/api/admin/forum/posts/{post}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::removePost
* @see app/Http/Controllers/Admin/ForumModerationController.php:54
* @route '/api/admin/forum/posts/{post}'
*/
removePost.url = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return removePost.definition.url
            .replace('{post}', parsedArgs.post.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::removePost
* @see app/Http/Controllers/Admin/ForumModerationController.php:54
* @route '/api/admin/forum/posts/{post}'
*/
removePost.delete = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: removePost.url(args, options),
    method: 'delete',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::removePost
* @see app/Http/Controllers/Admin/ForumModerationController.php:54
* @route '/api/admin/forum/posts/{post}'
*/
const removePostForm = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: removePost.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ForumModerationController::removePost
* @see app/Http/Controllers/Admin/ForumModerationController.php:54
* @route '/api/admin/forum/posts/{post}'
*/
removePostForm.delete = (args: { post: string | number } | [post: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: removePost.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

removePost.form = removePostForm

const ForumModerationController = { lockThread, removeThread, hidePost, removePost }

export default ForumModerationController