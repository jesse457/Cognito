import AuthController from './AuthController'
import AccountController from './AccountController'
import CourseController from './CourseController'
import EnrollmentController from './EnrollmentController'
import GamificationController from './GamificationController'
import LessonController from './LessonController'
import PracticeSessionController from './PracticeSessionController'
import AdaptiveController from './AdaptiveController'
import NotificationController from './NotificationController'
import ReportController from './ReportController'
import LiveCallController from './LiveCallController'

const Student = {
    AuthController: Object.assign(AuthController, AuthController),
    AccountController: Object.assign(AccountController, AccountController),
    CourseController: Object.assign(CourseController, CourseController),
    EnrollmentController: Object.assign(EnrollmentController, EnrollmentController),
    GamificationController: Object.assign(GamificationController, GamificationController),
    LessonController: Object.assign(LessonController, LessonController),
    PracticeSessionController: Object.assign(PracticeSessionController, PracticeSessionController),
    AdaptiveController: Object.assign(AdaptiveController, AdaptiveController),
    NotificationController: Object.assign(NotificationController, NotificationController),
    ReportController: Object.assign(ReportController, ReportController),
    LiveCallController: Object.assign(LiveCallController, LiveCallController),
}

export default Student