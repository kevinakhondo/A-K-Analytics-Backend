exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email role');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};