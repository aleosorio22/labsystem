const { audit } = require('../../../core/audit');
const EmpresaModel = require('../models/empresaModel');

exports.get = async (_req, res) => {
  res.json(await EmpresaModel.get());
};

exports.update = async (req, res) => {
  const anterior = await EmpresaModel.get();
  const data = { ...req.validated };
  if (data.email === '') data.email = null;
  const row = await EmpresaModel.update(data);
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'empresa', registroId: anterior.id, anterior, nuevo: row });
  res.json(row);
};
