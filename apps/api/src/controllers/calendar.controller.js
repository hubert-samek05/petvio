const { query } = require('../config/database');

const getEvents = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT hc.*, p.name as pet_name, p.species as pet_species
       FROM health_calendar hc
       JOIN pets p ON hc.pet_id = p.id
       WHERE p.user_id = $1
       ORDER BY hc.event_date ASC, hc.created_at ASC`,
      [userId]
    );

    res.json({
      events: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania wydarzeń',
        status: 500,
      },
    });
  }
};

const createEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId, eventType, eventDate, title, description, reminderEnabled } = req.body;

    if (!petId || !eventType || !eventDate || !title) {
      return res.status(400).json({
        error: {
          message: 'Wymagane pola: petId, eventType, eventDate, title',
          status: 400,
        },
      });
    }

    const petCheck = await query(
      'SELECT id FROM pets WHERE id = $1 AND user_id = $2',
      [petId, userId]
    );

    if (petCheck.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Zwierzę nie zostało znalezione',
          status: 404,
        },
      });
    }

    const result = await query(
      `INSERT INTO health_calendar (pet_id, event_type, event_date, title, description, reminder_enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [petId, eventType, eventDate, title, description || '', reminderEnabled !== false]
    );

    res.status(201).json({
      message: 'Wydarzenie zostało dodane',
      event: result.rows[0],
    });
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas dodawania wydarzenia',
        status: 500,
      },
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const eventId = req.params.id;
    const { eventType, eventDate, title, description, completed, reminderEnabled } = req.body;

    const result = await query(
      `UPDATE health_calendar hc
       SET event_type = COALESCE($1, hc.event_type),
           event_date = COALESCE($2, hc.event_date),
           title = COALESCE($3, hc.title),
           description = COALESCE($4, hc.description),
           completed = COALESCE($5, hc.completed),
           reminder_enabled = COALESCE($6, hc.reminder_enabled),
           updated_at = NOW()
       FROM pets p
       WHERE hc.pet_id = p.id AND hc.id = $7 AND p.user_id = $8
       RETURNING hc.*`,
      [eventType, eventDate, title, description, completed, reminderEnabled, eventId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Wydarzenie nie zostało znalezione',
          status: 404,
        },
      });
    }

    res.json({
      message: 'Wydarzenie zostało zaktualizowane',
      event: result.rows[0],
    });
  } catch (error) {
    console.error('Update calendar event error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas aktualizacji wydarzenia',
        status: 500,
      },
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const eventId = req.params.id;

    const result = await query(
      `DELETE FROM health_calendar hc
       USING pets p
       WHERE hc.pet_id = p.id AND hc.id = $1 AND p.user_id = $2
       RETURNING hc.id`,
      [eventId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Wydarzenie nie zostało znalezione',
          status: 404,
        },
      });
    }

    res.json({
      message: 'Wydarzenie zostało usunięte',
    });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas usuwania wydarzenia',
        status: 500,
      },
    });
  }
};

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
