export const getInitialSetupDone = () =>
  JSON.parse(localStorage.getItem("parco_pm_initial_setup_done") || "false");

export const setInitialSetupDone = (v: boolean) =>
  localStorage.setItem("parco_pm_initial_setup_done", JSON.stringify(v));

