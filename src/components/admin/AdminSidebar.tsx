export default function AdminSidebar() {
  return (
    <aside className="w-64 min-h-screen border-r bg-white p-4">
      <h2 className="mb-6 text-xl font-bold">
        LMS Admin
      </h2>

      <nav className="space-y-2">
        <div>Dashboard</div>
        <div>Employees</div>
        <div>Leave Requests</div>
        <div>Leave Types</div>
        <div>Holidays</div>
        <div>Attendance</div>
        <div>Settings</div>
      </nav>
    </aside>
  );
}