import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../wayfinder'
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
* @see \App\Http\Controllers\Student\AccountController::password
* @see app/Http/Controllers/Student/AccountController.php:50
* @route '/api/account/password'
*/
export const password = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: password.url(options),
    method: 'post',
})

password.definition = {
    methods: ["post"],
    url: '/api/account/password',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Student\AccountController::password
* @see app/Http/Controllers/Student/AccountController.php:50
* @route '/api/account/password'
*/
password.url = (options?: RouteQueryOptions) => {
    return password.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\AccountController::password
* @see app/Http/Controllers/Student/AccountController.php:50
* @route '/api/account/password'
*/
password.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: password.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\AccountController::password
* @see app/Http/Controllers/Student/AccountController.php:50
* @route '/api/account/password'
*/
const passwordForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: password.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\AccountController::password
* @see app/Http/Controllers/Student/AccountController.php:50
* @route '/api/account/password'
*/
passwordForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: password.url(options),
    method: 'post',
})

password.form = passwordForm

const account = {
    show: Object.assign(show, show),
    update: Object.assign(update, update),
    password: Object.assign(password, password),
}

export default account