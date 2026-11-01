import Student from './Student'
import Admin from './Admin'
import Instructor from './Instructor'
import Auth from './Auth'
import Panel from './Panel'
import LiveCallController from './LiveCallController'

const Controllers = {
    Student: Object.assign(Student, Student),
    Admin: Object.assign(Admin, Admin),
    Instructor: Object.assign(Instructor, Instructor),
    Auth: Object.assign(Auth, Auth),
    Panel: Object.assign(Panel, Panel),
    LiveCallController: Object.assign(LiveCallController, LiveCallController),
}

export default Controllers