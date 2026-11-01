import threads from './threads'
import posts from './posts'

const forum = {
    threads: Object.assign(threads, threads),
    posts: Object.assign(posts, posts),
}

export default forum