/** The small, scannable labels under a question. */
export default function TagList({ tags }: { tags: string[] }) {
    if (tags.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
                <span key={tag} className="tag">
                    {tag}
                </span>
            ))}
        </div>
    );
}
