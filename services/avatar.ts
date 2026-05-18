/**
 * Convert any image URI (file://, content://, blob:, data:, http) into a
 * self-contained data: URL. Storing the avatar as a data URL means it travels
 * through the existing AsyncStorage → progress-table sync without needing a
 * Supabase Storage bucket, and it renders on every platform (including web)
 * because there is no platform-specific filesystem path to resolve.
 *
 * Returns null if the URI can't be read.
 */
export async function toAvatarDataUrl(uri: string): Promise<string | null> {
  try {
    // Already a data URL — nothing to do.
    if (uri.startsWith('data:')) return uri;

    const res = await fetch(uri);
    const blob = await res.blob();

    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        resolve(typeof result === 'string' ? result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.log('Avatar conversion failed:', e);
    return null;
  }
}
