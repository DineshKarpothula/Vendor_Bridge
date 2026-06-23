import jwt from 'jsonwebtoken';

import { User, Vendor } from '../models.js';

function getTokenFromHeader(headerValue) {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured' });
    }

    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive account' });
    }

    let vendorId = user.vendorId?.toString?.() || null;

    if (user.role === 'vendor' && !vendorId) {
      const vendor = await Vendor.findOne({
        $or: [{ linkedUserId: user._id }, { contactEmail: user.email }]
      });

      if (vendor) {
        vendorId = vendor._id.toString();
        user.vendorId = vendor._id;
        await user.save();
      }
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      vendorId
    };
    req.authUser = user;

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden for this role' });
    }

    return next();
  };
}
