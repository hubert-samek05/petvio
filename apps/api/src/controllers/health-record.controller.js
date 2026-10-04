const { query } = require('../config/database');

const getRecordsByPet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = req.params.petId;

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
      `SELECT * FROM health_records
       WHERE pet_id = $1
       ORDER BY record_date DESC`,
      [petId]
    );

    res.json({
      records: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get health records error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania rekordów zdrowia',
        status: 500,
      },
    });
  }
};

const createRecord = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId, recordType, recordDate, title, description, veterinarian, nextDate, documents } = req.body;

    if (!petId || !recordType || !recordDate || !title) {
      return res.status(400).json({
        error: {
          message: 'Wymagane pola: petId, recordType, recordDate, title',
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
      `INSERT INTO health_records (pet_id, record_type, record_date, title, description, 
                                   veterinarian, next_date, documents, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [petId, recordType, recordDate, title, description, veterinarian, nextDate, JSON.stringify(documents || [])]
    );

    res.status(201).json({
      message: 'Rekord zdrowia został dodany pomyślnie',
      record: result.rows[0],
    });
  } catch (error) {
    console.error('Create health record error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas dodawania rekordu zdrowia',
        status: 500,
      },
    });
  }
};

const getRecordById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const recordId = req.params.id;

    const result = await query(
      `SELECT hr.* FROM health_records hr
       JOIN pets p ON hr.pet_id = p.id
       WHERE hr.id = $1 AND p.user_id = $2`,
      [recordId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Rekord zdrowia nie został znaleziony',
          status: 404,
        },
      });
    }

    res.json({
      record: result.rows[0],
    });
  } catch (error) {
    console.error('Get health record error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania rekordu zdrowia',
        status: 500,
      },
    });
  }
};

const updateRecord = async (req, res) => {
  try {
    const userId = req.user.userId;
    const recordId = req.params.id;
    const { recordType, recordDate, title, description, veterinarian, nextDate, documents } = req.body;

    const result = await query(
      `UPDATE health_records hr
       SET record_type = COALESCE($1, hr.record_type),
           record_date = COALESCE($2, hr.record_date),
           title = COALESCE($3, hr.title),
           description = COALESCE($4, hr.description),
           veterinarian = COALESCE($5, hr.veterinarian),
           next_date = COALESCE($6, hr.next_date),
           documents = COALESCE($7, hr.documents),
           updated_at = NOW()
       FROM pets p
       WHERE hr.pet_id = p.id AND hr.id = $8 AND p.user_id = $9
       RETURNING hr.*`,
      [recordType, recordDate, title, description, veterinarian, nextDate, 
       documents ? JSON.stringify(documents) : null, recordId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Rekord zdrowia nie został znaleziony',
          status: 404,
        },
      });
    }

    res.json({
      message: 'Rekord zdrowia został zaktualizowany pomyślnie',
      record: result.rows[0],
    });
  } catch (error) {
    console.error('Update health record error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas aktualizacji rekordu zdrowia',
        status: 500,
      },
    });
  }
};

const deleteRecord = async (req, res) => {
  try {
    const userId = req.user.userId;
    const recordId = req.params.id;

    const result = await query(
      `DELETE FROM health_records hr
       USING pets p
       WHERE hr.pet_id = p.id AND hr.id = $1 AND p.user_id = $2
       RETURNING hr.id`,
      [recordId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Rekord zdrowia nie został znaleziony',
          status: 404,
        },
      });
    }

    res.json({
      message: 'Rekord zdrowia został usunięty pomyślnie',
    });
  } catch (error) {
    console.error('Delete health record error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas usuwania rekordu zdrowia',
        status: 500,
      },
    });
  }
};

module.exports = {
  getRecordsByPet,
  createRecord,
  getRecordById,
  updateRecord,
  deleteRecord,
};
