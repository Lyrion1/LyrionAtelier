# Contributing to Lyrīon Atelier

Thank you for your interest in contributing to Lyrīon Atelier! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/LyrionAtelier.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Commit your changes: `git commit -m "Add your message"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Code Standards

### JavaScript
- Use ES6+ features (const/let, arrow functions, template literals)
- Add JSDoc comments for functions
- Use meaningful variable names
- Keep functions small and focused
- Add error handling where appropriate

### CSS
- Follow BEM naming convention where applicable
- Use CSS variables for colors and common values
- Keep selectors simple and maintainable
- Add comments for complex styles
- Ensure responsive design works on all screen sizes

### HTML
- Use semantic HTML5 elements
- Add ARIA labels for accessibility
- Include alt text for images
- Use proper heading hierarchy (h1, h2, h3, etc.)
- Validate HTML using W3C validator

### Accessibility
- Ensure keyboard navigation works
- Add ARIA attributes where needed
- Test with screen readers
- Maintain proper color contrast
- Provide text alternatives for media

## Adding New Products

To add a new product:

1. Open `js/products.js`
2. Add a new object to the `products` array
3. Include all required fields: id, name, price, category, zodiac, image, description, sizes
4. Use the next available ID number
5. Test that the product appears correctly on the shop page

## Testing Checklist

Before submitting a pull request, ensure:

- [ ] All pages load without errors
- [ ] Shopping cart functionality works
- [ ] Product filtering works correctly
- [ ] Forms validate properly
- [ ] Mobile navigation functions correctly
- [ ] All links work
- [ ] Accessibility features are maintained
- [ ] No console errors in browser
- [ ] Code follows project conventions
- [ ] README is updated if needed

## Reporting Issues

When reporting issues:

1. Check if the issue already exists
2. Use a clear, descriptive title
3. Provide steps to reproduce
4. Include browser/OS information
5. Add screenshots if applicable
6. Describe expected vs actual behavior

## Pull Request Process

1. Update README.md if you've added features
2. Ensure all tests pass (if applicable)
3. Request review from maintainers
4. Address feedback from code review
5. Merge will be done by project maintainers

## Questions?

If you have questions, feel free to open an issue or contact info@lyrionatelier.com

Thank you for contributing! ✨
