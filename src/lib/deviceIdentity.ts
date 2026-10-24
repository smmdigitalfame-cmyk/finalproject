// Browser/app installation identity, shared by login, guards and uploads.
export function getDeviceId(): string {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }
  return id;
}