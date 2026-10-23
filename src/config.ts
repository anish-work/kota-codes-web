// Registration settings. Edit these, then rebuild and redeploy.
export const CONFIG = {
  // Google Apps Script web app URL (Deploy > Manage deployments > Web app URL, ends in /exec).
  // While empty, the form shows an error instead of sending.
  webAppUrl: '',

  // WhatsApp group invite link, shown after someone registers. Keep in sync with the Settings tab in the Sheet.
  whatsappGroupUrl: '',

  // Leave name empty until the venue is announced; the page then says "venue to be announced".
  venue: {
    name: '',
    address: '',
    mapsUrl: '',
  },

  whatToBring: 'Your phone. A laptop and charger if you have one.',
};
