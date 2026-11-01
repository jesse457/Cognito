import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Panel\Instructor\AssignmentController::assignCourse
* @see app/Http/Controllers/Panel/Instructor/AssignmentController.php:33
* @route '/instructor/classes/{class}/courses'
*/
export const assignCourse = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: assignCourse.url(args, options),
    method: 'post',
})

assignCourse.definition = {
    methods: ["post"],
    url: '/instructor/classes/{class}/courses',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Instructor\AssignmentController::assignCourse
* @see app/Http/Controllers/Panel/Instructor/AssignmentController.php:33
* @route '/instructor/classes/{class}/courses'
*/
assignCourse.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return assignCourse.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Instructor\AssignmentController::assignCourse
* @see app/Http/Controllers/Panel/Instructor/AssignmentController.php:33
* @route '/instructor/classes/{class}/courses'
*/
assignCourse.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: assignCourse.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\AssignmentController::assignCourse
* @see app/Http/Controllers/Panel/Instructor/AssignmentController.php:33
* @route '/instructor/classes/{class}/courses'
*/
const assignCourseForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: assignCourse.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\AssignmentController::assignCourse
* @see app/Http/Controllers/Panel/Instructor/AssignmentController.php:33
* @route '/instructor/classes/{class}/courses'
*/
assignCourseForm.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: assignCourse.url(args, options),
    method: 'post',
})

assignCourse.form = assignCourseForm

/**
* @see \App\Http\Controllers\Panel\Instructor\AssignmentController::assignLesson
* @see app/Http/Controllers/Panel/Instructor/AssignmentController.php:56
* @route '/instructor/classes/{class}/students/{student}/lessons'
*/
export const assignLesson = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: assignLesson.url(args, options),
    method: 'post',
})

assignLesson.definition = {
    methods: ["post"],
    url: '/instructor/classes/{class}/students/{student}/lessons',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Instructor\AssignmentController::assignLesson
* @see app/Http/Controllers/Panel/Instructor/AssignmentController.php:56
* @route '/instructor/classes/{class}/students/{student}/lessons'
*/
assignLesson.url = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
            class: args[0],
            student: args[1],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
        student: args.student,
    }

    return assignLesson.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace('{student}', parsedArgs.student.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Instructor\AssignmentController::assignLesson
* @see app/Http/Controllers/Panel/Instructor/AssignmentController.php:56
* @route '/instructor/classes/{class}/students/{student}/lessons'
*/
assignLesson.post = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: assignLesson.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\AssignmentController::assignLesson
* @see app/Http/Controllers/Panel/Instructor/AssignmentController.php:56
* @route '/instructor/classes/{class}/students/{student}/lessons'
*/
const assignLessonForm = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: assignLesson.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\AssignmentController::assignLesson
* @see app/Http/Controllers/Panel/Instructor/AssignmentController.php:56
* @route '/instructor/classes/{class}/students/{student}/lessons'
*/
assignLessonForm.post = (args: { class: string | number, student: string | number } | [classParam: string | number, student: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: assignLesson.url(args, options),
    method: 'post',
})

assignLesson.form = assignLessonForm

const AssignmentController = { assignCourse, assignLesson }

export default AssignmentController