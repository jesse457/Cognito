import HomeController from './HomeController'
import Admin from './Admin'
import Instructor from './Instructor'

const Panel = {
    HomeController: Object.assign(HomeController, HomeController),
    Admin: Object.assign(Admin, Admin),
    Instructor: Object.assign(Instructor, Instructor),
}

export default Panel