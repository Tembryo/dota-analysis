package dotaReplayProcessor;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.Map;

import com.google.protobuf.Descriptors.FieldDescriptor;

import skadistats.clarity.Clarity;
import skadistats.clarity.wire.common.proto.Demo.CDemoFileInfo;
import skadistats.clarity.wire.common.proto.Demo.CGameInfo;
import skadistats.clarity.wire.common.proto.Demo.CGameInfo.CDotaGameInfo;
import skadistats.clarity.wire.common.proto.Demo.CGameInfo.CDotaGameInfo.CPlayerInfo;

public class Main {

	public static void main(String[] args) {
		 long tStart = System.currentTimeMillis();
		
		 System.out.println(Paths.get(".").toAbsolutePath().normalize().toString());
		 
		String filename_replay = args[0];
		String directory_out = "output/";
		try {
			int matchid = Clarity.infoForFile(filename_replay).getGameInfo().getDota().getMatchId();
			directory_out += matchid+"/";
			boolean success = (new File(directory_out)).mkdirs();
			if (!success) {
			    // Directory creation failed
				System.out.println("failed to create output dir");
			}
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			return;
		}
				 
		OutputGenerator output = new OutputGenerator(directory_out);
		
        CDemoFileInfo info;
		try {
			info = Clarity.infoForFile(filename_replay);
			CGameInfo game_info = info.getGameInfo();
			CDotaGameInfo dota_info = game_info.getDota();
	        output.writeGameData(dota_info.getMatchId(), dota_info.getRadiantTeamTag(), dota_info.getDireTeamTag(), dota_info.getGameWinner() == 2 ? "radiant":(dota_info.getGameWinner() == 3? "dire":"unknown winner"));

	        for(int i = 0; i < dota_info.getPlayerInfoCount(); ++i)
	        {
	        	CPlayerInfo player = dota_info.getPlayerInfo(i);
	        	if(!player.getIsFakeClient())
	        		output.writePlayerInfo(i, player.getPlayerName(), player.getSteamid(), player.getHeroName(), player.getGameTeam());
	        }
		} catch (IOException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
        
		ReplayProcessor processor;
		try {
			processor = new ReplayProcessor(filename_replay, output);
			processor.process();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

        long tMatch = System.currentTimeMillis() - tStart;
        System.out.printf("total time taken: %s s", (tMatch) / 1000.0);
		
        output.finish();
	}

}
