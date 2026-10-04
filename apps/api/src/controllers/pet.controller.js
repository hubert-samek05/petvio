const { query } = require('../config/database');

const getAllPets = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT id, name, species, breed, birth_date, gender, weight, photo_url, 
              microchip_number, created_at, updated_at
       FROM pets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      pets: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get pets error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania zwierząt',
        status: 500,
      },
    });
  }
};

const createPet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, species, breed, birthDate, gender, weight, photoUrl, microchipNumber } = req.body;

    if (!name || !species) {
      return res.status(400).json({
        error: {
          message: 'Imię i gatunek są wymagane',
          status: 400,
        },
      });
    }

    const result = await query(
      `INSERT INTO pets (user_id, name, species, breed, birth_date, gender, weight, 
                         photo_url, microchip_number, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [userId, name, species, breed, birthDate, gender, weight, photoUrl, microchipNumber]
    );

    res.status(201).json({
      message: 'Zwierzę zostało dodane pomyślnie',
      pet: result.rows[0],
    });
  } catch (error) {
    console.error('Create pet error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas dodawania zwierzęcia',
        status: 500,
      },
    });
  }
};

const getPetById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = req.params.id;

    const result = await query(
      'SELECT * FROM pets WHERE id = $1 AND user_id = $2',
      [petId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Zwierzę nie zostało znalezione',
          status: 404,
        },
      });
    }

    res.json({
      pet: result.rows[0],
    });
  } catch (error) {
    console.error('Get pet error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania zwierzęcia',
        status: 500,
      },
    });
  }
};

const updatePet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = req.params.id;
    const { name, species, breed, birthDate, gender, weight, photoUrl, microchipNumber } = req.body;

    const result = await query(
      `UPDATE pets
       SET name = COALESCE($1, name),
           species = COALESCE($2, species),
           breed = COALESCE($3, breed),
           birth_date = COALESCE($4, birth_date),
           gender = COALESCE($5, gender),
           weight = COALESCE($6, weight),
           photo_url = COALESCE($7, photo_url),
           microchip_number = COALESCE($8, microchip_number),
           updated_at = NOW()
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [name, species, breed, birthDate, gender, weight, photoUrl, microchipNumber, petId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Zwierzę nie zostało znalezione',
          status: 404,
        },
      });
    }

    res.json({
      message: 'Zwierzę zostało zaktualizowane pomyślnie',
      pet: result.rows[0],
    });
  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas aktualizacji zwierzęcia',
        status: 500,
      },
    });
  }
};

const deletePet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = req.params.id;

    const result = await query(
      'DELETE FROM pets WHERE id = $1 AND user_id = $2 RETURNING id',
      [petId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Zwierzę nie zostało znalezione',
          status: 404,
        },
      });
    }

    res.json({
      message: 'Zwierzę zostało usunięte pomyślnie',
    });
  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas usuwania zwierzęcia',
        status: 500,
      },
    });
  }
};

module.exports = {
  getAllPets,
  createPet,
  getPetById,
  updatePet,
  deletePet,
};
