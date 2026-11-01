import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\Panel\Admin\UserController::index
* @see app/Http/Controllers/Panel/Admin/UserController.php:26
* @route '/admin/users'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/admin/users',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Panel\Admin\UserController::index
* @see app/Http/Controllers/Panel/Admin/UserController.php:26
* @route '/admin/users'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\UserController::index
* @see app/Http/Controllers/Panel/Admin/UserController.php:26
* @route '/admin/users'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserController::index
* @see app/Http/Controllers/Panel/Admin/UserController.php:26
* @route '/admin/users'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserController::index
* @see app/Http/Controllers/Panel/Admin/UserController.php:26
* @route '/admin/users'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserController::index
* @see app/Http/Controllers/Panel/Admin/UserController.php:26
* @route '/admin/users'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserController::index
* @see app/Http/Controllers/Panel/Admin/UserController.php:26
* @route '/admin/users'
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
* @see \App\Http\Controllers\Panel\Admin\UserController::show
* @see app/Http/Controllers/Panel/Admin/UserController.php:72
* @route '/admin/users/{user}'
*/
export const show = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/admin/users/{user}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Panel\Admin\UserController::show
* @see app/Http/Controllers/Panel/Admin/UserController.php:72
* @route '/admin/users/{user}'
*/
show.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return show.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\UserController::show
* @see app/Http/Controllers/Panel/Admin/UserController.php:72
* @route '/admin/users/{user}'
*/
show.get = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserController::show
* @see app/Http/Controllers/Panel/Admin/UserController.php:72
* @route '/admin/users/{user}'
*/
show.head = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserController::show
* @see app/Http/Controllers/Panel/Admin/UserController.php:72
* @route '/admin/users/{user}'
*/
const showForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserController::show
* @see app/Http/Controllers/Panel/Admin/UserController.php:72
* @route '/admin/users/{user}'
*/
showForm.get = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserController::show
* @see app/Http/Controllers/Panel/Admin/UserController.php:72
* @route '/admin/users/{user}'
*/
showForm.head = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
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
* @see \App\Http\Controllers\Panel\Admin\UserActionController::warn
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:28
* @route '/admin/users/{user}/warn'
*/
export const warn = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: warn.url(args, options),
    method: 'post',
})

warn.definition = {
    methods: ["post"],
    url: '/admin/users/{user}/warn',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::warn
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:28
* @route '/admin/users/{user}/warn'
*/
warn.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return warn.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::warn
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:28
* @route '/admin/users/{user}/warn'
*/
warn.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: warn.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::warn
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:28
* @route '/admin/users/{user}/warn'
*/
const warnForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: warn.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::warn
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:28
* @route '/admin/users/{user}/warn'
*/
warnForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: warn.url(args, options),
    method: 'post',
})

warn.form = warnForm

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::suspend
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:41
* @route '/admin/users/{user}/suspend'
*/
export const suspend = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: suspend.url(args, options),
    method: 'post',
})

suspend.definition = {
    methods: ["post"],
    url: '/admin/users/{user}/suspend',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::suspend
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:41
* @route '/admin/users/{user}/suspend'
*/
suspend.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return suspend.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::suspend
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:41
* @route '/admin/users/{user}/suspend'
*/
suspend.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: suspend.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::suspend
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:41
* @route '/admin/users/{user}/suspend'
*/
const suspendForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: suspend.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::suspend
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:41
* @route '/admin/users/{user}/suspend'
*/
suspendForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: suspend.url(args, options),
    method: 'post',
})

suspend.form = suspendForm

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::ban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:55
* @route '/admin/users/{user}/ban'
*/
export const ban = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: ban.url(args, options),
    method: 'post',
})

ban.definition = {
    methods: ["post"],
    url: '/admin/users/{user}/ban',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::ban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:55
* @route '/admin/users/{user}/ban'
*/
ban.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return ban.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::ban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:55
* @route '/admin/users/{user}/ban'
*/
ban.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: ban.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::ban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:55
* @route '/admin/users/{user}/ban'
*/
const banForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: ban.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::ban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:55
* @route '/admin/users/{user}/ban'
*/
banForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: ban.url(args, options),
    method: 'post',
})

ban.form = banForm

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::unban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:68
* @route '/admin/users/{user}/unban'
*/
export const unban = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: unban.url(args, options),
    method: 'post',
})

unban.definition = {
    methods: ["post"],
    url: '/admin/users/{user}/unban',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::unban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:68
* @route '/admin/users/{user}/unban'
*/
unban.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return unban.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::unban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:68
* @route '/admin/users/{user}/unban'
*/
unban.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: unban.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::unban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:68
* @route '/admin/users/{user}/unban'
*/
const unbanForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: unban.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::unban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:68
* @route '/admin/users/{user}/unban'
*/
unbanForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: unban.url(args, options),
    method: 'post',
})

unban.form = unbanForm

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::role
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:81
* @route '/admin/users/{user}/role'
*/
export const role = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: role.url(args, options),
    method: 'post',
})

role.definition = {
    methods: ["post"],
    url: '/admin/users/{user}/role',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::role
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:81
* @route '/admin/users/{user}/role'
*/
role.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return role.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::role
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:81
* @route '/admin/users/{user}/role'
*/
role.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: role.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::role
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:81
* @route '/admin/users/{user}/role'
*/
const roleForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: role.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::role
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:81
* @route '/admin/users/{user}/role'
*/
roleForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: role.url(args, options),
    method: 'post',
})

role.form = roleForm

const users = {
    index: Object.assign(index, index),
    show: Object.assign(show, show),
    warn: Object.assign(warn, warn),
    suspend: Object.assign(suspend, suspend),
    ban: Object.assign(ban, ban),
    unban: Object.assign(unban, unban),
    role: Object.assign(role, role),
}

export default users