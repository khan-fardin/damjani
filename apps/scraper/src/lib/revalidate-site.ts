export async function revalidateSiteCatalog() {
  const endpoint = process.env.SITE_REVALIDATE_URL;
  const token = process.env.REVALIDATE_TOKEN;
  if (!endpoint || !token) {
    process.stderr.write("Catalog cache revalidation skipped; configure SITE_REVALIDATE_URL and REVALIDATE_TOKEN to enable it.\n");
    return false;
  }
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      process.stderr.write(`Catalog cache revalidation failed (HTTP ${response.status}).\n`);
      return false;
    }
    process.stdout.write("Damjani catalog cache revalidated.\n");
    return true;
  } catch {
    process.stderr.write("Catalog cache revalidation request failed; the time-based cache will refresh within 15 minutes.\n");
    return false;
  }
}
