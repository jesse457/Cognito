import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::index
* @see app/Http/Controllers/Panel/Admin/ReportController.php:32
* @route '/admin/reports'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/admin/reports',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::index
* @see app/Http/Controllers/Panel/Admin/ReportController.php:32
* @route '/admin/reports'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::index
* @see app/Http/Controllers/Panel/Admin/ReportController.php:32
* @route '/admin/reports'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::index
* @see app/Http/Controllers/Panel/Admin/ReportController.php:32
* @route '/admin/reports'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::index
* @see app/Http/Controllers/Panel/Admin/ReportController.php:32
* @route '/admin/reports'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::index
* @see app/Http/Controllers/Panel/Admin/ReportController.php:32
* @route '/admin/reports'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::index
* @see app/Http/Controllers/Panel/Admin/ReportController.php:32
* @route '/admin/reports'
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
* @see \App\Http\Controllers\Panel\Admin\ReportController::show
* @see app/Http/Controllers/Panel/Admin/ReportController.php:69
* @route '/admin/reports/{report}'
*/
export const show = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/admin/reports/{report}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::show
* @see app/Http/Controllers/Panel/Admin/ReportController.php:69
* @route '/admin/reports/{report}'
*/
show.url = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { report: args }
    }

    if (Array.isArray(args)) {
        args = {
            report: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        report: args.report,
    }

    return show.definition.url
            .replace('{report}', parsedArgs.report.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::show
* @see app/Http/Controllers/Panel/Admin/ReportController.php:69
* @route '/admin/reports/{report}'
*/
show.get = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::show
* @see app/Http/Controllers/Panel/Admin/ReportController.php:69
* @route '/admin/reports/{report}'
*/
show.head = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::show
* @see app/Http/Controllers/Panel/Admin/ReportController.php:69
* @route '/admin/reports/{report}'
*/
const showForm = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::show
* @see app/Http/Controllers/Panel/Admin/ReportController.php:69
* @route '/admin/reports/{report}'
*/
showForm.get = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::show
* @see app/Http/Controllers/Panel/Admin/ReportController.php:69
* @route '/admin/reports/{report}'
*/
showForm.head = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
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
* @see \App\Http\Controllers\Panel\Admin\ReportController::assign
* @see app/Http/Controllers/Panel/Admin/ReportController.php:110
* @route '/admin/reports/{report}/assign'
*/
export const assign = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: assign.url(args, options),
    method: 'post',
})

assign.definition = {
    methods: ["post"],
    url: '/admin/reports/{report}/assign',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::assign
* @see app/Http/Controllers/Panel/Admin/ReportController.php:110
* @route '/admin/reports/{report}/assign'
*/
assign.url = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { report: args }
    }

    if (Array.isArray(args)) {
        args = {
            report: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        report: args.report,
    }

    return assign.definition.url
            .replace('{report}', parsedArgs.report.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::assign
* @see app/Http/Controllers/Panel/Admin/ReportController.php:110
* @route '/admin/reports/{report}/assign'
*/
assign.post = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: assign.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::assign
* @see app/Http/Controllers/Panel/Admin/ReportController.php:110
* @route '/admin/reports/{report}/assign'
*/
const assignForm = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: assign.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::assign
* @see app/Http/Controllers/Panel/Admin/ReportController.php:110
* @route '/admin/reports/{report}/assign'
*/
assignForm.post = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: assign.url(args, options),
    method: 'post',
})

assign.form = assignForm

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::resolve
* @see app/Http/Controllers/Panel/Admin/ReportController.php:125
* @route '/admin/reports/{report}/resolve'
*/
export const resolve = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: resolve.url(args, options),
    method: 'post',
})

resolve.definition = {
    methods: ["post"],
    url: '/admin/reports/{report}/resolve',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::resolve
* @see app/Http/Controllers/Panel/Admin/ReportController.php:125
* @route '/admin/reports/{report}/resolve'
*/
resolve.url = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { report: args }
    }

    if (Array.isArray(args)) {
        args = {
            report: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        report: args.report,
    }

    return resolve.definition.url
            .replace('{report}', parsedArgs.report.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::resolve
* @see app/Http/Controllers/Panel/Admin/ReportController.php:125
* @route '/admin/reports/{report}/resolve'
*/
resolve.post = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: resolve.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::resolve
* @see app/Http/Controllers/Panel/Admin/ReportController.php:125
* @route '/admin/reports/{report}/resolve'
*/
const resolveForm = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: resolve.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::resolve
* @see app/Http/Controllers/Panel/Admin/ReportController.php:125
* @route '/admin/reports/{report}/resolve'
*/
resolveForm.post = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: resolve.url(args, options),
    method: 'post',
})

resolve.form = resolveForm

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::dismiss
* @see app/Http/Controllers/Panel/Admin/ReportController.php:156
* @route '/admin/reports/{report}/dismiss'
*/
export const dismiss = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: dismiss.url(args, options),
    method: 'post',
})

dismiss.definition = {
    methods: ["post"],
    url: '/admin/reports/{report}/dismiss',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::dismiss
* @see app/Http/Controllers/Panel/Admin/ReportController.php:156
* @route '/admin/reports/{report}/dismiss'
*/
dismiss.url = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { report: args }
    }

    if (Array.isArray(args)) {
        args = {
            report: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        report: args.report,
    }

    return dismiss.definition.url
            .replace('{report}', parsedArgs.report.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::dismiss
* @see app/Http/Controllers/Panel/Admin/ReportController.php:156
* @route '/admin/reports/{report}/dismiss'
*/
dismiss.post = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: dismiss.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::dismiss
* @see app/Http/Controllers/Panel/Admin/ReportController.php:156
* @route '/admin/reports/{report}/dismiss'
*/
const dismissForm = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: dismiss.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\ReportController::dismiss
* @see app/Http/Controllers/Panel/Admin/ReportController.php:156
* @route '/admin/reports/{report}/dismiss'
*/
dismissForm.post = (args: { report: string | number } | [report: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: dismiss.url(args, options),
    method: 'post',
})

dismiss.form = dismissForm

const reports = {
    index: Object.assign(index, index),
    show: Object.assign(show, show),
    assign: Object.assign(assign, assign),
    resolve: Object.assign(resolve, resolve),
    dismiss: Object.assign(dismiss, dismiss),
}

export default reports