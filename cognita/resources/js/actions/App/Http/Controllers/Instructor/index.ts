import InstructorDashboardController from './InstructorDashboardController'
import InstructorClassController from './InstructorClassController'
import InstructorStudentController from './InstructorStudentController'
import InstructorNoteController from './InstructorNoteController'
import InstructorAnalyticsController from './InstructorAnalyticsController'
import InstructorAnnouncementController from './InstructorAnnouncementController'
import InstructorAssignmentController from './InstructorAssignmentController'
import InstructorInvitationController from './InstructorInvitationController'
import InstructorBriefingController from './InstructorBriefingController'

const Instructor = {
    InstructorDashboardController: Object.assign(InstructorDashboardController, InstructorDashboardController),
    InstructorClassController: Object.assign(InstructorClassController, InstructorClassController),
    InstructorStudentController: Object.assign(InstructorStudentController, InstructorStudentController),
    InstructorNoteController: Object.assign(InstructorNoteController, InstructorNoteController),
    InstructorAnalyticsController: Object.assign(InstructorAnalyticsController, InstructorAnalyticsController),
    InstructorAnnouncementController: Object.assign(InstructorAnnouncementController, InstructorAnnouncementController),
    InstructorAssignmentController: Object.assign(InstructorAssignmentController, InstructorAssignmentController),
    InstructorInvitationController: Object.assign(InstructorInvitationController, InstructorInvitationController),
    InstructorBriefingController: Object.assign(InstructorBriefingController, InstructorBriefingController),
}

export default Instructor