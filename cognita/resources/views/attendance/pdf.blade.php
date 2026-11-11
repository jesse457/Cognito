<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; color: #191c20; font-family: Helvetica, Arial, sans-serif; font-size: 11px; }
        h1 { margin: 0; font-size: 21px; }
        p { margin: 0; }
        .eyebrow { color: #68717d; font-size: 9px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; }
        .header { border-bottom: 2px solid #191c20; padding-bottom: 12px; }
        .meta { margin-top: 4px; color: #5d6670; }
        .summary { display: flex; gap: 10px; margin: 14px 0; }
        .summary div { border: 1px solid #d8dce1; border-radius: 8px; padding: 8px 14px; }
        .summary strong { display: block; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f2f4f6; border-bottom: 1px solid #cbd1d8; padding: 7px 8px; text-align: left; font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; }
        td { border-bottom: 1px solid #e4e7eb; padding: 7px 8px; }
        .present { color: #176b38; font-weight: bold; }
        .absent { color: #9b2c24; font-weight: bold; }
        .muted { color: #68717d; }
    </style>
</head>
<body>
    <div class="header">
        <p class="eyebrow">Attendance register</p>
        <h1>{{ $report['classroom'] }}</h1>
        <p class="meta">{{ $report['date_label'] }} · generated automatically from call joins</p>
    </div>

    <div class="summary">
        <div><span class="muted">Present</span><strong>{{ $report['present'] }}</strong></div>
        <div><span class="muted">Absent</span><strong>{{ $report['absent'] }}</strong></div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Status</th>
                <th>First joined</th>
                <th>Last seen</th>
                <th>Time in class</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($report['rows'] as $row)
                <tr>
                    <td>{{ $row['name'] }}</td>
                    <td class="muted">{{ $row['email'] }}</td>
                    <td class="{{ strtolower($row['status']) }}">{{ $row['status'] }}</td>
                    <td>{{ $row['first_joined'] }}</td>
                    <td>{{ $row['last_seen'] }}</td>
                    <td>{{ $row['duration'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" class="muted">No students have joined this class yet.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
