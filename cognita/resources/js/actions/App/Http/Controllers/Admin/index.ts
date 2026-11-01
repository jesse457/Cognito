import StaffInvitationController from './StaffInvitationController'
import DashboardController from './DashboardController'
import AdminUserController from './AdminUserController'
import ImpersonationController from './ImpersonationController'
import AdminReportController from './AdminReportController'
import CourseModerationController from './CourseModerationController'
import ForumModerationController from './ForumModerationController'
import AuditLogController from './AuditLogController'
import SystemSettingController from './SystemSettingController'

const Admin = {
    StaffInvitationController: Object.assign(StaffInvitationController, StaffInvitationController),
    DashboardController: Object.assign(DashboardController, DashboardController),
    AdminUserController: Object.assign(AdminUserController, AdminUserController),
    ImpersonationController: Object.assign(ImpersonationController, ImpersonationController),
    AdminReportController: Object.assign(AdminReportController, AdminReportController),
    CourseModerationController: Object.assign(CourseModerationController, CourseModerationController),
    ForumModerationController: Object.assign(ForumModerationController, ForumModerationController),
    AuditLogController: Object.assign(AuditLogController, AuditLogController),
    SystemSettingController: Object.assign(SystemSettingController, SystemSettingController),
}

export default Admin