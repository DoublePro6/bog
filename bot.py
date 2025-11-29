# bot.py - Discord bot with slash command
import discord
from discord import app_commands
import requests

# Configuration
BACKEND_URL = 'https://web-production-4d919.up.railway.app'
BOT_TOKEN = 'MTQ0MjE2OTk3Nzk1NTE1NjAyMA.GftKPW.e46xTt9EBG3w3FU0vYqNQqgyOEO3cqgEEkzNLM'

# Setup bot with intents
intents = discord.Intents.default()
intents.message_content = True

class MyClient(discord.Client):
    def __init__(self):
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)
    
    async def setup_hook(self):
        # Sync commands with Discord
        await self.tree.sync()
        print("Commands synced!")

client = MyClient()

@client.event
async def on_ready():
    print(f'✅ Logged in as {client.user.name} ({client.user.id})')
    print(f'🔗 Bot is ready! Use /verify to get your verification link')
    print('------')

@client.tree.command(name="verify", description="Get your verification link to log your IP address")
async def verify(interaction: discord.Interaction):
    """Slash command that generates a unique verification link"""
    user_id = str(interaction.user.id)
    verification_link = f"{BACKEND_URL}/verify/{user_id}"
    
    # Create an embed for a nicer looking message
    embed = discord.Embed(
        title="🔒 IP Verification",
        description="Click the link below to verify and log your IP address.",
        color=discord.Color.blue()
    )
    embed.add_field(
        name="Verification Link",
        value=f"[Click here to verify]({verification_link})",
        inline=False
    )
    embed.add_field(
        name="⚠️ Privacy Notice",
        value="By clicking this link, your IP address will be logged and associated with your Discord account.",
        inline=False
    )
    embed.set_footer(text=f"User ID: {user_id}")
    
    # Send the embed as an ephemeral message (only visible to the user)
    await interaction.response.send_message(embed=embed, ephemeral=True)
    
    print(f"📤 Sent verification link to {interaction.user.name} (ID: {user_id})")

@client.tree.command(name="myip", description="Check your logged IP address")
async def myip(interaction: discord.Interaction):
    """Check if user's IP has been logged"""
    user_id = str(interaction.user.id)
    
    try:
        response = requests.get(f'{BACKEND_URL}/api/logs')
        logs = response.json()
        
        if user_id in logs:
            ip_data = logs[user_id]
            ip = ip_data['ip'] if isinstance(ip_data, dict) else ip_data
            
            embed = discord.Embed(
                title="📊 Your Logged Information",
                color=discord.Color.green()
            )
            embed.add_field(name="IP Address", value=f"`{ip}`", inline=False)
            
            if isinstance(ip_data, dict) and 'timestamp' in ip_data:
                embed.add_field(name="Logged At", value=ip_data['timestamp'], inline=False)
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
        else:
            await interaction.response.send_message(
                "❌ No IP logged for your account yet. Use `/verify` to log your IP.",
                ephemeral=True
            )
    except requests.exceptions.RequestException as e:
        print(f'Error: {e}')
        await interaction.response.send_message(
            '❌ Failed to retrieve logs. Make sure the server is running.',
            ephemeral=True
        )

@client.tree.command(name="logs", description="[ADMIN] View all logged IPs")
async def logs(interaction: discord.Interaction):
    """Admin command to view all logs"""
    # Check if user has administrator permissions
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message(
            "❌ You need administrator permissions to use this command.",
            ephemeral=True
        )
        return
    
    try:
        response = requests.get(f'{BACKEND_URL}/api/logs')
        logs = response.json()
        
        if not logs:
            await interaction.response.send_message("📝 No logs yet.", ephemeral=True)
            return
        
        # Create embed with logs
        embed = discord.Embed(
            title="📊 All Logged IPs",
            description=f"Total entries: {len(logs)}",
            color=discord.Color.gold()
        )
        
        # Show up to 10 most recent entries
        count = 0
        for discord_id, ip_data in list(logs.items())[:10]:
            count += 1
            ip = ip_data['ip'] if isinstance(ip_data, dict) else ip_data
            embed.add_field(
                name=f"User ID: {discord_id}",
                value=f"IP: `{ip}`",
                inline=False
            )
        
        if len(logs) > 10:
            embed.set_footer(text=f"Showing 10 of {len(logs)} entries")
        
        await interaction.response.send_message(embed=embed, ephemeral=True)
        
    except requests.exceptions.RequestException as e:
        print(f'Error: {e}')
        await interaction.response.send_message(
            '❌ Failed to retrieve logs. Make sure the server is running.',
            ephemeral=True
        )

# Run the bot
if __name__ == '__main__':
    client.run(BOT_TOKEN)
