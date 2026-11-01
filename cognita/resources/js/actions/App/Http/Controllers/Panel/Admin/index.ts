import DashboardController from './DashboardController'
import UserController from './UserController'
import UserActionController from './UserActionController'
import ReportController from './ReportController'
import CourseController from './CourseController'
import AuditController from './AuditController'
import SettingController from './SettingController'
import InvitationController from './InvitationController'

const Admin = {
    DashboardController: Object.assign(DashboardController, DashboardController),
    UserController: Object.assign(UserController, UserController),
    UserActionController: Object.assign(UserActionController, UserActionController),
    ReportController: Object.assign(ReportController, ReportController),
    CourseController: Object.assign(CourseController, CourseController),
    AuditController: Object.assign(AuditController, AuditController),
    SettingController: Object.assign(SettingController, SettingController),
    InvitationController: Object.assign(InvitationController, InvitationController),
}

export default Admin