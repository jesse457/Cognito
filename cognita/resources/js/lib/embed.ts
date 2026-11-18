/**
 * A video URL becomes an embed only for the two hosts we trust with it.
 *
 * Everything else stays an ordinary link, so a lesson can never smuggle an
 * arbitrary frame into the page. The instructor's preview and the student's
 * lesson page share this one rule.
 */
export function embedUrl(url: string | null): string | null {
    if (url === null || url.trim() === '') {
        return null;
    }

    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '');

        if (host === 'youtube.com' || host === 'm.youtube.com') {
            const id = parsed.searchParams.get('v');
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }

        if (host === 'youtu.be') {
            const id = parsed.pathname.slice(1);
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }

        if (host === 'vimeo.com' || host === 'player.vimeo.com') {
            const id = parsed.pathname.split('/').filter(Boolean).pop();
            return id ? `https://player.vimeo.com/video/${id}` : null;
        }

        return null;
    } catch {
        return null;
    }
}
