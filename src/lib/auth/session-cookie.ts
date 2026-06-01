// Constantes du cookie de session — sans dépendance à next/headers,
// pour être importables aussi bien côté serveur que dans le middleware (edge).
export const SESSION_COOKIE = "df_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours
