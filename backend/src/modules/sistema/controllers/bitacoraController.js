const BitacoraModel = require('../models/bitacoraModel');

exports.getAll = async (req, res) => {
  const { page, limit, tabla, accion, desde, hasta } = req.query;
  res.json(await BitacoraModel.getPaginado({ page, limit, tabla, accion, desde, hasta }));
};
