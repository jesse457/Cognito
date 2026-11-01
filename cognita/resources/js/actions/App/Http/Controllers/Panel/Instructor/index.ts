import DashboardController from './DashboardController'
import ClassController from './ClassController'
import AnnouncementController from './AnnouncementController'
import AssignmentController from './AssignmentController'
import InvitationController from './InvitationController'
import AnalyticsController from './AnalyticsController'
import StudentController from './StudentController'
import NoteController from './NoteController'

const Instructor = {
    DashboardController: Object.assign(DashboardController, DashboardController),
    ClassController: Object.assign(ClassController, ClassController),
    AnnouncementController: Object.assign(AnnouncementController, AnnouncementController),
    AssignmentController: Object.assign(AssignmentController, AssignmentController),
    InvitationController: Object.assign(InvitationController, InvitationController),
    AnalyticsController: Object.assign(AnalyticsController, AnalyticsController),
    StudentController: Object.assign(StudentController, StudentController),
    NoteController: Object.assign(NoteController, NoteController),
}

export default Instructor