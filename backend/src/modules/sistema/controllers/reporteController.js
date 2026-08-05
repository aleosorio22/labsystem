const ReporteModel = require('../models/reporteModel');

exports.dashboard = async (_req, res) => {
  res.json(await ReporteModel.dashboard());
};

exports.ventas = async (req, res) => {
  const { desde, hasta } = req.validated;
  res.json(await ReporteModel.ventas(desde, hasta));
};

exports.ganancias = async (req, res) => {
  const { desde, hasta } = req.validated;
  res.json(await ReporteModel.ganancias(desde, hasta));
};

exports.comisionesMedicos = async (req, res) => {
  const { desde, hasta } = req.validated;
  res.json(await ReporteModel.comisionesMedicos(desde, hasta));
};
