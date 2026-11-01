import admin from './admin'
import instructor from './instructor'

const panel = {
    admin: Object.assign(admin, admin),
    instructor: Object.assign(instructor, instructor),
}

export default panel