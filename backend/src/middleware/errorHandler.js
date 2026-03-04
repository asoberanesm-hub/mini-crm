export default (err, req, res, next) => {
  console.error(err)
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'ID inválido' })
  }
  if (err.name === 'MongooseServerSelectionError' || err.code === 'ECONNREFUSED') {
    return res.status(503).json({ error: 'Base de datos no conectada. Revisa MONGODB_URI en backend/.env y que MongoDB Atlas esté accesible.' })
  }
  res.status(500).json({ error: 'Error interno del servidor' })
}
