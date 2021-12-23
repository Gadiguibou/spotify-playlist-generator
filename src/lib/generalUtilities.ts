export function getMinimalSizeImageUrl(
    height: number,
    width: number,
    images: { height: number; width: number; url: string }[]
): string | undefined {
    let image = images
        .filter((i) => i.height > height && i.width > width)
        .sort((a, b) => a.height * a.width - b.height * b.width)[0];
    if (!image && images.length > 0) {
        return images[0].url;
    } else if (!image) {
        return undefined;
    } else {
        return image.url;
    }
}

export function* takeWhile<T>(predicate: (item: T) => Boolean, items: Iterable<T>) {
    for (const i of items) {
        if (predicate(i)) {
            yield i;
        } else {
            break;
        }
    }
}
