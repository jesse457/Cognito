/**
 * URLs for the class group voice-call surface.
 *
 * The routes are mounted only when `FEATURE_LIVE_CALLS=true`, so this module
 * keeps the console links buildable in both flag states instead of importing
 * generated Wayfinder helpers that disappear when the flag is off.
 */
type IdArg =
    | number
    | string
    | { class?: number | string; id?: number | string };

function idFrom(value: IdArg): string {
    if (typeof value === 'object') {
        const candidate = value.class ?? value.id;

        if (candidate === undefined) {
            throw new Error('A class id is required.');
        }

        return String(candidate);
    }

    return String(value);
}

const liveCallRoutes = {
    show: {
        url: (args: IdArg): string => `/live-calls/${idFrom(args)}`,
    },
    token: {
        url: (args: IdArg): string => `/live-calls/${idFrom(args)}/token`,
    },
};

export default liveCallRoutes;
