const express = require('express');
const Attendance = require('../models/Attendance');
const authenticateToken = require('../middleware/auth');
const jsPDF = require('jspdf');
require('jspdf-autotable');

const router = express.Router();
router.use(authenticateToken);

// POST /attendance/update - Update presentTime when face detected
router.post('/update', async (req, res) => {
  const { studentId, sessionId, timeIncrement } = req.body;

  if (!studentId || !sessionId || timeIncrement === undefined) {
    return res.status(400).json({ error: 'studentId, sessionId, and timeIncrement are required' });
  }

  console.log(`[Attendance] update request studentId=${studentId} sessionId=${sessionId} increment=${timeIncrement}`);

  try {
    // Find existing attendance record
    let attendance = await Attendance.findOne({ studentId, sessionId });

    if (attendance) {
      attendance.presentTime += Number(timeIncrement);
      attendance.timestamp = new Date();
      await attendance.save();
      console.log(`[Attendance] updated record ${attendance._id} presentTime=${attendance.presentTime}`);
    } else {
      attendance = new Attendance({
        studentId,
        sessionId,
        presentTime: Number(timeIncrement),
        status: 'Pending',
        timestamp: new Date()
      });
      await attendance.save();
      console.log(`[Attendance] created record ${attendance._id} presentTime=${attendance.presentTime}`);
    }

    res.json({
      success: true,
      attendance,
      message: attendance.presentTime > timeIncrement ? 'Present time updated' : 'New attendance record created'
    });
  } catch (err) {
    console.error('Attendance update error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate attendance record for this student and session' });
    }
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// GET /attendance/report/:sessionId - Generate PDF report for session attendance
router.get('/report/:sessionId', async (req, res) => {
  try {
    const attendances = await Attendance.find({ sessionId: req.params.sessionId })
      .sort({ timestamp: -1 });

    if (attendances.length === 0) {
      return res.status(404).json({ success: false, error: 'No attendance records found for this session' });
    }

    const User = require('../models/User');
    const populatedAttendances = await Promise.all(
      attendances.map(async (att) => {
        const user = await User.findById(att.studentId);
        return {
          ...att.toObject(),
          studentName: user ? user.name : 'Unknown Student'
        };
      })
    );

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Attendance Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Session ID: ${req.params.sessionId}`, 20, 35);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
    doc.text(`Total Records: ${populatedAttendances.length}`, 20, 55);

    const tableData = populatedAttendances.map(att => [
      att.studentId,
      att.studentName,
      att.presentTime ? `${Math.round(att.presentTime)}s` : '0s',
      att.status,
      att.timestamp ? new Date(att.timestamp).toLocaleString() : 'N/A'
    ]);

    doc.autoTable({
      head: [['Student ID', 'Student Name', 'Present Time', 'Status', 'Last Updated']],
      body: tableData,
      startY: 65,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${req.params.sessionId}.pdf`);
    const pdfBuffer = doc.output('arraybuffer');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('Generate report error:', err);
    res.status(500).json({ error: 'Failed to generate attendance report' });
  }
});

// GET /attendance/:sessionId - Get all attendance records for a session
router.get('/:sessionId', async (req, res) => {
  try {
    const attendances = await Attendance.find({ sessionId: req.params.sessionId })
      .sort({ timestamp: -1 });

    console.log(`[Attendance] fetch sessionId=${req.params.sessionId} records=${attendances.length}`);

    const User = require('../models/User');
    const populatedAttendances = await Promise.all(
      attendances.map(async (att) => {
        const user = await User.findById(att.studentId);
        return {
          ...att.toObject(),
          studentName: user ? user.name : 'Unknown Student'
        };
      })
    );

    res.json({
      success: true,
      sessionId: req.params.sessionId,
      attendances: populatedAttendances,
      totalRecords: populatedAttendances.length
    });
  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// POST /attendance/finalize/:sessionId - Finalize attendance at session end
router.post('/finalize/:sessionId', async (req, res) => {
  const { requiredTime } = req.body; // requiredTime in the same unit as presentTime

  if (requiredTime === undefined) {
    return res.status(400).json({ error: 'requiredTime is required' });
  }

  try {
    const attendances = await Attendance.find({ sessionId: req.params.sessionId });

    // Update status for each attendance record
    const updates = attendances.map(att => ({
      updateOne: {
        filter: { _id: att._id },
        update: {
          status: att.presentTime >= requiredTime ? 'Present' : 'Absent'
        }
      }
    }));

    if (updates.length > 0) {
      await Attendance.bulkWrite(updates);
    }

    // Fetch updated records
    const updatedAttendances = await Attendance.find({ sessionId: req.params.sessionId });

    res.json({
      success: true,
      sessionId: req.params.sessionId,
      requiredTime: requiredTime,
      finalizedRecords: updatedAttendances.length,
      attendances: updatedAttendances
    });
  } catch (err) {
    console.error('Finalize attendance error:', err);
    res.status(500).json({ error: 'Failed to finalize attendance' });
  }
});

module.exports = router;