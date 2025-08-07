# AI Model Configuration Guide

## Quick Setup

To change your AI model, add this line to your `.env.local` file:

```env
AI_MODEL=gpt-4o-mini
```

## Model Recommendations

### 🟢 **Best for Free Tier (Recommended)**
```env
AI_MODEL=gpt-4o-mini
```
- **Cost**: $0.00015 per 1K tokens (extremely cheap!)
- **Free Tier**: Very high limits
- **Quality**: Good for most use cases
- **Speed**: Very fast

### 🟡 **Good Balance**
```env
AI_MODEL=gpt-3.5-turbo
```
- **Cost**: $0.002 per 1K tokens
- **Free Tier**: High limits
- **Quality**: Good performance
- **Speed**: Fast

### 🔴 **Premium (Expensive)**
```env
AI_MODEL=gpt-4o
```
- **Cost**: $0.005 per 1K tokens
- **Free Tier**: Standard limits
- **Quality**: Best available
- **Speed**: Fast

## Cost Comparison

| Model | Cost per 1K tokens | Monthly Cost (1000 messages) | Free Tier Status |
|-------|-------------------|------------------------------|------------------|
| gpt-4o-mini | $0.00015 | ~$0.15 | ✅ High limits |
| gpt-3.5-turbo | $0.002 | ~$2.00 | ✅ High limits |
| gpt-4o | $0.005 | ~$5.00 | ⚠️ Standard limits |

## How to Switch Models

1. **Edit your `.env.local` file**:
   ```env
   AI_MODEL=gpt-4o-mini
   ```

2. **Restart your development server**:
   ```bash
   npm run dev
   ```

3. **Test the new model** by sending a message

## Troubleshooting

### "Quota Exceeded" Error
- Switch to `gpt-4o-mini` (cheapest option)
- Check your OpenAI billing dashboard
- Add payment method if needed

### "Model Not Found" Error
- Ensure the model name is correct
- Check OpenAI's current model list
- Use one of the supported models above

### Performance Issues
- `gpt-4o-mini` is fastest
- `gpt-3.5-turbo` is fast
- `gpt-4o` is fast but more expensive

## Current Model Status

The app will log which model is being used in the console. You can check this in your browser's developer tools or server logs.

## Free Tier Strategy

1. **Start with `gpt-4o-mini`** - cheapest and highest limits
2. **Monitor usage** in OpenAI dashboard
3. **Upgrade only if needed** for better quality
4. **Use development mode** for testing without API calls 