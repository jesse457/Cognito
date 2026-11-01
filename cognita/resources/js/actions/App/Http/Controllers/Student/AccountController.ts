import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Student\AccountController::show
* @see app/Http/Controllers/Student/AccountController.php:20
* @route '/api/account'
*/
export const show = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/api/account',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Student\AccountController::show
* @see app/Http/Controllers/Student/AccountController.php:20
* @route '/api/account'
*/
show.url = (options?: RouteQueryOptions) => {
    return show.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\AccountController::show
* @see app/Http/Controllers/Student/AccountController.php:20
* @route '/api/account'
*/
show.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\AccountController::show
* @see app/Http/Controllers/Student/AccountController.php:20
* @route '/api/account'
*/
show.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Student\AccountController::show
* @see app/Http/Controllers/Student/AccountController.php:20
* @route '/api/account'
*/
const showForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\AccountController::show
* @see app/Http/Controllers/Student/AccountController.php:20
* @route '/api/account'
*/
showForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\AccountController::show
* @see app/Http/Controllers/Student/AccountController.php:20
* @route '/api/account'
*/
showForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url({
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

show.form = showForm

/**
* @see \App\Http\Controllers\Student\AccountController::update
* @see app/Http/Controllers/Student/AccountController.php:40
* @route '/api/account'
*/
export const update = (options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(options),
    method: 'put',
})

update.definition = {
    methods: ["put"],
    url: '/api/account',
} satisfies RouteDefinition<["put"]>

/**
* @see \App\Http\Controllers\Student\AccountController::update
* @see app/Http/Controllers/Student/AccountController.php:40
* @route '/api/account'
*/
update.url = (options?: RouteQueryOptions) => {
    return update.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\AccountController::update
* @see app/Http/Controllers/Student/AccountController.php:40
* @route '/api/account'
*/
update.put = (options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(options),
    method: 'put',
})

/**
* @see \App\Http\Controllers\Student\AccountController::update
* @see app/Http/Controllers/Student/AccountController.php:40
* @route '/api/account'
*/
const updateForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: update.url({
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'PUT',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\AccountController::update
* @see app/Http/Controllers/Student/AccountController.php:40
* @route '/api/account'
*/
updateForm.put = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: update.url({
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'PUT',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

update.form = updateForm

/**
* @see \App\Http\Controllers\Student\AccountController::updatePassword
* @see app/Http/Controllers/Student/AccountController.php:50
* @route '/api/account/password'
*/
export const updatePassword = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: updatePassword.url(options),
    method: 'post',
})

updatePassword.definition = {
    methods: ["post"],
    url: '/api/account/password',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Student\AccountController::updatePassword
* @see app/Http/Controllers/Student/AccountController.php:50
* @route '/api/account/password'
*/
updatePassword.url = (options?: RouteQueryOptions) => {
    return updatePassword.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\AccountController::updatePassword
* @see app/Http/Controllers/Student/AccountController.php:50
* @route '/api/account/password'
*/
updatePassword.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: updatePassword.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\AccountController::updatePassword
* @see app/Http/Controllers/Student/AccountController.php:50
* @route '/api/account/password'
*/
const updatePasswordForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: updatePassword.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\AccountController::updatePassword
* @see app/Http/Controllers/Student/AccountController.php:50
* @route '/api/account/password'
*/
updatePasswordForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: updatePassword.url(options),
    method: 'post',
})

updatePassword.form = updatePasswordForm

const AccountController = { show, update, updatePassword }

export default AccountController