import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../wayfinder'
import students from './students'
import notes from './notes'
import analytics from './analytics'
import announcements from './announcements'
import courses from './courses'
import invitations from './invitations'
/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::index
* @see app/Http/Controllers/Instructor/InstructorClassController.php:30
* @route '/api/instructor/classes'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::index
* @see app/Http/Controllers/Instructor/InstructorClassController.php:30
* @route '/api/instructor/classes'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::index
* @see app/Http/Controllers/Instructor/InstructorClassController.php:30
* @route '/api/instructor/classes'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::index
* @see app/Http/Controllers/Instructor/InstructorClassController.php:30
* @route '/api/instructor/classes'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::index
* @see app/Http/Controllers/Instructor/InstructorClassController.php:30
* @route '/api/instructor/classes'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::index
* @see app/Http/Controllers/Instructor/InstructorClassController.php:30
* @route '/api/instructor/classes'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::index
* @see app/Http/Controllers/Instructor/InstructorClassController.php:30
* @route '/api/instructor/classes'
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
* @see \App\Http\Controllers\Instructor\InstructorClassController::store
* @see app/Http/Controllers/Instructor/InstructorClassController.php:43
* @route '/api/instructor/classes'
*/
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/instructor/classes',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::store
* @see app/Http/Controllers/Instructor/InstructorClassController.php:43
* @route '/api/instructor/classes'
*/
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::store
* @see app/Http/Controllers/Instructor/InstructorClassController.php:43
* @route '/api/instructor/classes'
*/
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::store
* @see app/Http/Controllers/Instructor/InstructorClassController.php:43
* @route '/api/instructor/classes'
*/
const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::store
* @see app/Http/Controllers/Instructor/InstructorClassController.php:43
* @route '/api/instructor/classes'
*/
storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

store.form = storeForm

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::show
* @see app/Http/Controllers/Instructor/InstructorClassController.php:65
* @route '/api/instructor/classes/{class}'
*/
export const show = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::show
* @see app/Http/Controllers/Instructor/InstructorClassController.php:65
* @route '/api/instructor/classes/{class}'
*/
show.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { class: args }
    }

    if (Array.isArray(args)) {
        args = {
            class: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
    }

    return show.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::show
* @see app/Http/Controllers/Instructor/InstructorClassController.php:65
* @route '/api/instructor/classes/{class}'
*/
show.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::show
* @see app/Http/Controllers/Instructor/InstructorClassController.php:65
* @route '/api/instructor/classes/{class}'
*/
show.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::show
* @see app/Http/Controllers/Instructor/InstructorClassController.php:65
* @route '/api/instructor/classes/{class}'
*/
const showForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::show
* @see app/Http/Controllers/Instructor/InstructorClassController.php:65
* @route '/api/instructor/classes/{class}'
*/
showForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::show
* @see app/Http/Controllers/Instructor/InstructorClassController.php:65
* @route '/api/instructor/classes/{class}'
*/
showForm.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
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
* @see \App\Http\Controllers\Instructor\InstructorClassController::update
* @see app/Http/Controllers/Instructor/InstructorClassController.php:79
* @route '/api/instructor/classes/{class}'
*/
export const update = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'patch'> => ({
    url: update.url(args, options),
    method: 'patch',
})

update.definition = {
    methods: ["patch"],
    url: '/api/instructor/classes/{class}',
} satisfies RouteDefinition<["patch"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::update
* @see app/Http/Controllers/Instructor/InstructorClassController.php:79
* @route '/api/instructor/classes/{class}'
*/
update.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { class: args }
    }

    if (Array.isArray(args)) {
        args = {
            class: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
    }

    return update.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::update
* @see app/Http/Controllers/Instructor/InstructorClassController.php:79
* @route '/api/instructor/classes/{class}'
*/
update.patch = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'patch'> => ({
    url: update.url(args, options),
    method: 'patch',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::update
* @see app/Http/Controllers/Instructor/InstructorClassController.php:79
* @route '/api/instructor/classes/{class}'
*/
const updateForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: update.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'PATCH',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::update
* @see app/Http/Controllers/Instructor/InstructorClassController.php:79
* @route '/api/instructor/classes/{class}'
*/
updateForm.patch = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: update.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'PATCH',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

update.form = updateForm

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::destroy
* @see app/Http/Controllers/Instructor/InstructorClassController.php:98
* @route '/api/instructor/classes/{class}'
*/
export const destroy = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/api/instructor/classes/{class}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::destroy
* @see app/Http/Controllers/Instructor/InstructorClassController.php:98
* @route '/api/instructor/classes/{class}'
*/
destroy.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { class: args }
    }

    if (Array.isArray(args)) {
        args = {
            class: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
    }

    return destroy.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::destroy
* @see app/Http/Controllers/Instructor/InstructorClassController.php:98
* @route '/api/instructor/classes/{class}'
*/
destroy.delete = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::destroy
* @see app/Http/Controllers/Instructor/InstructorClassController.php:98
* @route '/api/instructor/classes/{class}'
*/
const destroyForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: destroy.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorClassController::destroy
* @see app/Http/Controllers/Instructor/InstructorClassController.php:98
* @route '/api/instructor/classes/{class}'
*/
destroyForm.delete = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: destroy.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

destroy.form = destroyForm

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
export const dashboard = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: dashboard.url(args, options),
    method: 'get',
})

dashboard.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/dashboard',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
dashboard.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { class: args }
    }

    if (Array.isArray(args)) {
        args = {
            class: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
    }

    return dashboard.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
dashboard.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: dashboard.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
dashboard.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: dashboard.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
const dashboardForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: dashboard.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
dashboardForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: dashboard.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
dashboardForm.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: dashboard.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

dashboard.form = dashboardForm

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
export const heatmap = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: heatmap.url(args, options),
    method: 'get',
})

heatmap.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/heatmap',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
heatmap.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { class: args }
    }

    if (Array.isArray(args)) {
        args = {
            class: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
    }

    return heatmap.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
heatmap.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: heatmap.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
heatmap.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: heatmap.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
const heatmapForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: heatmap.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
heatmapForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: heatmap.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
heatmapForm.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: heatmap.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

heatmap.form = heatmapForm

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
export const atRisk = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: atRisk.url(args, options),
    method: 'get',
})

atRisk.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/at-risk',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
atRisk.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { class: args }
    }

    if (Array.isArray(args)) {
        args = {
            class: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
    }

    return atRisk.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
atRisk.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: atRisk.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
atRisk.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: atRisk.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
const atRiskForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: atRisk.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
atRiskForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: atRisk.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
atRiskForm.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: atRisk.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

atRisk.form = atRiskForm

/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::briefing
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
*/
export const briefing = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: briefing.url(args, options),
    method: 'get',
})

briefing.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/briefing',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::briefing
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
*/
briefing.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { class: args }
    }

    if (Array.isArray(args)) {
        args = {
            class: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
    }

    return briefing.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::briefing
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
*/
briefing.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: briefing.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::briefing
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
*/
briefing.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: briefing.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::briefing
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
*/
const briefingForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: briefing.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::briefing
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
*/
briefingForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: briefing.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::briefing
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
*/
briefingForm.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: briefing.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

briefing.form = briefingForm

const classes = {
    index: Object.assign(index, index),
    store: Object.assign(store, store),
    show: Object.assign(show, show),
    update: Object.assign(update, update),
    destroy: Object.assign(destroy, destroy),
    dashboard: Object.assign(dashboard, dashboard),
    students: Object.assign(students, students),
    notes: Object.assign(notes, notes),
    heatmap: Object.assign(heatmap, heatmap),
    atRisk: Object.assign(atRisk, atRisk),
    analytics: Object.assign(analytics, analytics),
    announcements: Object.assign(announcements, announcements),
    courses: Object.assign(courses, courses),
    invitations: Object.assign(invitations, invitations),
    briefing: Object.assign(briefing, briefing),
}

export default classes